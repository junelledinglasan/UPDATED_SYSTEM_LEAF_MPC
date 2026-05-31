import hashlib
import json
from django.db import models
from django.utils import timezone
from loans.models import Loan
from members.models import Member


class Payment(models.Model):
    tx_id        = models.CharField(max_length=30, unique=True, blank=True)
    loan         = models.ForeignKey(Loan,   on_delete=models.CASCADE, related_name='payments')
    member       = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='payments')
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    balance      = models.DecimalField(max_digits=12, decimal_places=2)
    note         = models.CharField(max_length=200, blank=True)
    recorded_by  = models.CharField(max_length=50)
    # Local SHA-256 hash (always generated) — full 64-char hex
    hash         = models.CharField(max_length=64, blank=True)
    # Polygon blockchain fields
    polygon_tx   = models.CharField(max_length=100, blank=True, null=True,
                                    help_text="Polygon transaction hash (0x...)")
    block_number = models.PositiveIntegerField(null=True, blank=True,
                                               help_text="Polygon block number")
    network      = models.CharField(max_length=20, default='local',
                                    help_text="'polygon' or 'local'")
    paid_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-paid_at']

    def __str__(self):
        return f'{self.tx_id} — {self.member.fullname} ₱{self.amount}'

    @property
    def explorer_url(self):
        if not self.polygon_tx:
            return None
        if self.network == 'polygon':
            return f"https://polygonscan.com/tx/{self.polygon_tx}"
        return f"https://amoy.polygonscan.com/tx/{self.polygon_tx}"

    def save(self, *args, **kwargs):
        if not self.tx_id:
            # Use max-based ID to avoid duplicates
            prefix   = f"TX-{timezone.now().strftime('%Y%m%d')}-"
            existing = Payment.objects.filter(tx_id__startswith=prefix).values_list('tx_id', flat=True)
            max_num  = 0
            for tid in existing:
                try:
                    num = int(tid.replace(prefix, ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
            self.tx_id = f"{prefix}{str(max_num + 1).zfill(3)}"

        if not self.hash:
            # Full SHA-256 hash — matches blockchain generate_payment_hash()
            payload   = json.dumps({
                'tx_id':     self.tx_id,
                'member_id': str(self.member_id),
                'loan_id':   str(self.loan_id),
                'amount':    str(self.amount),
            }, sort_keys=True)
            self.hash = hashlib.sha256(payload.encode()).hexdigest()

        super().save(*args, **kwargs)
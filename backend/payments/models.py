import hashlib
import json
from django.db import models
from django.utils import timezone
from loans.models import Loan
from members.models import Member


class Payment(models.Model):
    tx_id       = models.CharField(max_length=30, unique=True, blank=True)
    loan        = models.ForeignKey(Loan,   on_delete=models.CASCADE, related_name='payments')
    member      = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='payments')
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    balance     = models.DecimalField(max_digits=12, decimal_places=2)
    note        = models.CharField(max_length=200, blank=True)
    recorded_by = models.CharField(max_length=50)
    hash        = models.CharField(max_length=100, blank=True)
    paid_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-paid_at']

    def __str__(self):
        return f'{self.tx_id} — {self.member.fullname} ₱{self.amount}'

    def save(self, *args, **kwargs):
        if not self.tx_id:
            count      = Payment.objects.count() + 1
            self.tx_id = f"TX-{timezone.now().strftime('%Y%m%d')}-{str(count).zfill(3)}"
        if not self.hash:
            payload    = json.dumps({'tx': self.tx_id, 'amount': str(self.amount)}, sort_keys=True)
            self.hash  = hashlib.sha256(payload.encode()).hexdigest()[:32] + '...'
        super().save(*args, **kwargs)
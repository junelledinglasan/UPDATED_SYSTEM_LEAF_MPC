from django.db import models
from django.utils import timezone
from decimal import Decimal
from members.models import Member

# ── BAGO: 2% penalty kada buwang naliban sa due date, base sa
# "Monthly Amortization" (hindi sa buong balance/loan amount). ────────
PENALTY_RATE = Decimal('0.02')


# ══════════════════════════════════════════════════════════════════
#  BAGO: MAGKAKAIBA ANG INTEREST/FEES PER LOAN TYPE (at para sa
#  Regular Loan, magkaiba pa base sa AMOUNT BRACKET). Ito ang SINGLE
#  SOURCE OF TRUTH na dapat gamitin KAHIT SAAN kino-compute ang mga
#  ito (serializers.py, views.py) — dating naka-hardcode ang 3% CBU
#  at 1% Savings Deposit para sa LAHAT ng loan types sa views.py, at
#  ang tiered interest sa serializers.py ay base lang sa AMOUNT,
#  hindi isinasaalang-alang ang LOAN TYPE — parehong mali.
# ══════════════════════════════════════════════════════════════════
def get_loan_fee_structure(loan_type, amount):
    """Ibinabalik ang tamang interest_rate, service_fee_rate,
    filing_fee (fixed peso), cbu_rate, insurance_rate, at sd_rate
    (savings deposit rate) base sa loan_type — at para sa Regular
    Loan lang, base pa rin sa amount bracket.

    FIX: dating PLAIN PYTHON FLOAT ang ibinabalik dito (hal. 0.03).
    Ang "loan.amount" at ibang Loan fields ay Decimal (DecimalField),
    kaya kapag ginamit kaagad ang mga float value na 'to sa Decimal
    arithmetic (hal. "loan.amount * cbu_rate") SA PARIHONG REQUEST na
    bagong likha lang ang loan (hindi pa muling kinuha mula sa
    database), nagre-raise ito ng:
        TypeError: unsupported operand type(s) for *: 'decimal.Decimal' and 'float'
    Gumagana ito nang normal LANG kapag muling kinuha mula sa DB
    (awtomatikong nagiging Decimal doon), pero hindi sa fresh na
    in-memory object — ito mismo ang na-report na bug. Decimal na
    ngayon ang ibinabalik dito para maiwasan itong lubusan. """
    amount = float(amount)

    if loan_type == 'Regular Loan':
        if amount <= 50000:
            fees = {'interest_rate': 0.0125,  'service_fee_rate': 0.03, 'filing_fee': 50,  'cbu_rate': 0.03, 'insurance_rate': 0.0125, 'sd_rate': 0.01}
        elif amount <= 150000:
            fees = {'interest_rate': 0.01125, 'service_fee_rate': 0.03, 'filing_fee': 100, 'cbu_rate': 0.03, 'insurance_rate': 0.0125, 'sd_rate': 0.01}
        else:
            # ₱150,001–₱500,000 — "w/ Collateral" ay informational note
            # lang, HINDI required field (kumpirmado sa usapan).
            fees = {'interest_rate': 0.01,    'service_fee_rate': 0.03, 'filing_fee': 100, 'cbu_rate': 0.03, 'insurance_rate': 0.0125, 'sd_rate': 0.01}
    elif loan_type == 'Appliance Loan':
        # Walang CBU, walang Savings Deposit para sa Appliance Loan.
        fees = {'interest_rate': 0.0125, 'service_fee_rate': 0.03, 'filing_fee': 50, 'cbu_rate': 0, 'insurance_rate': 0.0125, 'sd_rate': 0}
    elif loan_type == 'ATM Loan':
        fees = {'interest_rate': 0.02, 'service_fee_rate': 0.03, 'filing_fee': 100, 'cbu_rate': 0.03, 'insurance_rate': 0.0125, 'sd_rate': 0.01}
    elif loan_type == 'Petty Cash Loan':
        # 3% Service Fee LANG — walang interest, walang Filing Fee,
        # walang Insurance, walang CBU, walang Savings Deposit.
        # Max ₱2,000, 1 buwan lang ang term (ino-enforce sa ibang lugar).
        fees = {'interest_rate': 0, 'service_fee_rate': 0.03, 'filing_fee': 0, 'cbu_rate': 0, 'insurance_rate': 0, 'sd_rate': 0}
    else:
        # Fallback — panatilihin ang lumang default kung sakaling may
        # bagong loan type sa hinaharap na hindi pa nakalista dito.
        fees = {'interest_rate': 0.0125, 'service_fee_rate': 0.03, 'filing_fee': 50, 'cbu_rate': 0.03, 'insurance_rate': 0.0125, 'sd_rate': 0.01}

    return {k: Decimal(str(v)) for k, v in fees.items()}


class Loan(models.Model):

    # ── FIX: dating luma pa rin ang mga choices dito (Regular/
    # Emergency/Salary/Housing/Business/Other) — kahit na-update na
    # natin ang lahat ng frontend (web + mobile) papuntang 4 na bagong
    # types, HINDI NATIN NA-UPDATE ANG BACKEND MODEL NA 'TO. Dahil
    # ino-enforce ng Django "choices" ang validation sa serializer
    # level, tinatanggihan ang mga bagong type name (hal. "ATM Loan")
    # na 400 Bad Request — ito ang totoong ugat ng "Failed to submit
    # loan." na error. ───────────────────────────────────────────────
    LOAN_TYPES = [
        ('Regular Loan',    'Regular Loan'),
        ('Petty Cash Loan', 'Petty Cash Loan'),
        ('Appliance Loan',  'Appliance Loan'),
        ('ATM Loan',        'ATM Loan'),
    ]

    STATUS_CHOICES = [
        ('For Review', 'For Review'),
        ('Approved',   'Approved'),
        ('Active',     'Active'),
        ('Completed',  'Completed'),
        ('Declined',   'Declined'),
        ('Overdue',    'Overdue'),
        # ── BAGO: hiwalay sa "Declined" — ito ay kapag ang MEMBER MISMO
        # ang nag-cancel ng sarili niyang "For Review" application, hindi
        # dahil sa desisyon ng admin. ─────────────────────────────────
        ('Cancelled',  'Cancelled'),
    ]

    loan_id        = models.CharField(max_length=20, unique=True, blank=True)
    member         = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='loans')
    loan_type      = models.CharField(max_length=20, choices=LOAN_TYPES)
    amount         = models.DecimalField(max_digits=12, decimal_places=2)
    term_months    = models.IntegerField()
    interest_rate  = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    # ── BAGO: dating ang service fee/filing fee/CBU/insurance/SD ay
    # kino-compute LANG sa frontend preview at sa views.py release
    # logic — HINDI ito na-i-STORE kahit saan sa Loan mismo. Dahil dito,
    # walang paraan para "matandaan" ng system kung ano talaga ang
    # rate na GINAMIT sa isang partikular na loan — lalo na kapag
    # in-edit ito ng admin sa F2F application (ang "Edit Rates"
    # feature ay cosmetic lang dati, dahil kino-compute ulit ng
    # backend ang sarili nitong default at ini-ignore ang binago ng
    # admin). Ngayon, ISTINATORE na ang mga ACTUAL na rate na ginamit
    # (kahit default o na-edit ng admin) sa paglikha ng loan, at ito
    # na ang babasahin sa oras ng pag-release (hindi na kino-compute
    # ulit), para talagang gumana ang pag-e-edit ng rates. ─────────────
    service_fee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.03)
    filing_fee_amt   = models.DecimalField(max_digits=10, decimal_places=2, default=50)
    cbu_rate         = models.DecimalField(max_digits=5, decimal_places=4, default=0.03)
    insurance_rate   = models.DecimalField(max_digits=5, decimal_places=4, default=0.0125)
    sd_rate          = models.DecimalField(max_digits=5, decimal_places=4, default=0.01)
    monthly_due    = models.DecimalField(max_digits=12, decimal_places=2)
    balance        = models.DecimalField(max_digits=12, decimal_places=2)
    purpose        = models.TextField()
    collateral     = models.CharField(max_length=200, blank=True)
    status         = models.CharField(max_length=15, choices=STATUS_CHOICES, default='For Review')
    applied_at     = models.DateTimeField(auto_now_add=True)
    approved_at    = models.DateTimeField(null=True, blank=True)
    approved_by    = models.CharField(max_length=50, blank=True)
    # ── BAGO: para sa 2-step na Approve → Confirm Release flow.
    # approved_at/approved_by = kailan/sino nag-"Approve" (status → Approved).
    # released_at/released_by = kailan/sino nag-"Confirm Release" (status → Active,
    # dito lang talaga nakuha ng member ang pera). ──────────────────────────────
    released_at    = models.DateTimeField(null=True, blank=True)
    released_by    = models.CharField(max_length=50, blank=True)
    next_due_date  = models.DateField(null=True, blank=True)
    # ── BAGO: bilang ng buwan na NAKA-APPLY NA ang 2% penalty, para sa
    # kasalukuyang "streak" ng pagkakalampas sa due date. Ginagamit para
    # hindi doble-doble maka-apply ng penalty sa parehong buwan kada
    # tawag ng "apply_overdue_penalty()" — tingnan ang method sa ibaba.
    # Nire-reset ito pabalik sa 0 kapag naabot na ulit ng member ang
    # kanyang susunod na due date (hindi na overdue). ───────────────────
    months_overdue_penalized = models.IntegerField(default=0)
    decline_reason = models.TextField(blank=True)
    remarks        = models.TextField(blank=True)

    class Meta:
        db_table = 'loans'
        ordering = ['-applied_at']

    def __str__(self):
        return f'{self.loan_id} — {self.member.fullname} ({self.status})'

    def save(self, *args, skip_multiplier_check=False, **kwargs):
        # ── BAGO: i-detect kung ang status ay NAGBABAGO PAPUNTA sa
        # "Completed" (kailangan kunin muna ang LUMANG status mula sa
        # database BAGO mag-save, dahil pagkatapos ma-save, wala nang
        # paraan para malaman kung ano ang dating status). Ginagamit
        # ito sa ibaba para i-trigger ang automatic loan multiplier
        # upgrade — ONE TIME lang ito mangyayari, sa eksaktong sandali
        # ng transition, hindi paulit-ulit sa bawat pag-save.
        # "skip_multiplier_check=True" ay para sa mga ADMINISTRATIVE
        # na pagsara ng loan (hal. sapilitang "Completed" habang
        # dine-deactivate ang isang member sa members_views.py) — HINDI
        # ito tunay na matagumpay na pagbabayad, kaya hindi dapat
        # bigyan ng 3x multiplier reward. ────────────────────────────
        just_completed = False
        if self.pk and not skip_multiplier_check:
            old_status = Loan.objects.filter(pk=self.pk).values_list('status', flat=True).first()
            if old_status != 'Completed' and self.status == 'Completed':
                just_completed = True

        if not self.loan_id:
            year   = timezone.now().year
            prefix = f'LN-{year}-'
            existing = Loan.objects.filter(
                loan_id__startswith=prefix
            ).values_list('loan_id', flat=True)
            max_num = 0
            for lid in existing:
                try:
                    num = int(lid.replace(prefix, ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
            candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            while Loan.objects.filter(loan_id=candidate).exists():
                max_num += 1
                candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            self.loan_id = candidate
        super().save(*args, **kwargs)

        # ── BAGO: awtomatikong itataas ang Loan Multiplier ng member
        # papuntang 3x (deretso, hindi dumadaan sa 2x) sa sandaling
        # ma-"Completed" (fully paid) ang KANILANG UNANG loan — pero
        # ONLY kung 1x pa rin sila (para hindi ma-overwrite ang
        # mano-manong pagbabago ng admin, kung sakaling may ibang
        # dahilan kung bakit iba na ang multiplier nila bago pa man
        # ma-Completed ang unang loan).
        # ── FIX: dating hindi isinasaalang-alang ang PAGKAKUMPLETO ng
        # Share Capital (₱4,000) dito — kaya kahit partial pa lang
        # (hal. ₱2,000) ang share capital ng miyembro, awtomatiko pa
        # rin siyang naitataas sa 3x sa sandaling na-completed niya ang
        # unang loan. Hindi ito tama: dapat DALAWA ang kondisyon bago
        # mag-3x — (1) na-completed na ang unang loan, AT (2) fully
        # paid na rin ang share capital (₱4,000 — kaparehong REQUIRED_
        # SHARE_CAPITAL na ginagamit sa sharecap/views.py). Kung hindi
        # pa kumpleto ang share capital, manatili munang 1x ang
        # multiplier — kahit na-completed na ang loan — hanggang sa
        # ma-completed ng miyembro ang ₱4,000 share capital niya. ──────
        if just_completed:
            completed_count = Loan.objects.filter(member=self.member, status='Completed').count()
            share_capital_complete = float(self.member.share_capital) >= 4000
            if completed_count == 1 and self.member.loan_multiplier == 1 and share_capital_complete:
                self.member.loan_multiplier = 3
                self.member.save(update_fields=['loan_multiplier'])

    # ══════════════════════════════════════════════════════════════════
    #  BAGO: 2% Penalty kada buwang naliban — tingnan ang usapan tungkol
    #  dito. Ang penalty ay 2% ng "Monthly Amortization" (hindi sa
    #  balance/loan amount), IDINAGDAG DIRETSO sa "balance" (parte na
    #  ng dapat bayaran ng member), at SUMASAMA kada karagdagang buwan
    #  na naliban (2 buwang naliban = 2x ang penalty).
    #
    #  Tinatawag ito sa mga lugar kung saan kinukuha/ipinapakita ang
    #  mga Active loans (hal. sa Loan Payment list view, o sa isang
    #  management command na tumatakbo araw-araw via cron) — hindi ito
    #  awtomatikong tumatakbo sa background nang mag-isa, kailangan
    #  itong TAWAGIN.
    # ══════════════════════════════════════════════════════════════════
    def apply_overdue_penalty(self):
        """I-check kung overdue na ang loan na 'to, at kung gayon,
        i-apply ang ESCALATING na 2% penalty — sa bawat buwan, ang
        batayan ng 2% ay ang KABUUANG naipong hindi pa bayad na
        monthly dues (hindi lang isang buwan), kaya lumalaki ang
        penalty kada karagdagang buwan:
            Buwan 1: (monthly_due × 1) × 2%
            Buwan 2: (monthly_due × 2) × 2%   ← mas malaki, dahil 2
                                                 buwan nang unpaid dues
            Buwan 3: (monthly_due × 3) × 2%
            ...at ang mga ito ay PINAGSASAMA (idinadagdag) sa bawat
        buwan — kaya ang TOTAL penalty pagkatapos ng N buwan ay:
            monthly_due × 2% × N × (N+1) / 2   (triangular number)
        Halimbawa: ₱10,000 loan, 3 months (monthly_due=₱3,333.33) —
        1 buwan late = ₱66.67, 2 buwan late = ₱200 total, 3 buwan
        late = ₱400 total.
        Hindi muling babayaran ang mga buwang na-penalize na dati —
        ang formula sa ibaba ay TAMANG NAG-IINCREMENT kahit tumalon
        nang maraming buwan sa isang tawag (gamit ang pagkakaiba ng
        dalawang triangular number). Ibinabalik ang halaga ng BAGONG
        idinagdag na penalty (0 kung wala)."""
        if self.status not in ('Active', 'Overdue') or not self.next_due_date:
            return Decimal('0.00')

        today = timezone.now().date()
        if self.next_due_date >= today:
            # Hindi pa overdue — kung dati ay overdue, i-reset ang counter.
            if self.months_overdue_penalized > 0:
                self.months_overdue_penalized = 0
                self.save(update_fields=['months_overdue_penalized'])
            return Decimal('0.00')

        # ── Bilangin kung ilang BUONG buwan na ang lumipas mula sa due
        # date (kasama na ang unang buwan mismo, dahil overdue na siya). ──
        months_late = (today.year - self.next_due_date.year) * 12 + (today.month - self.next_due_date.month)
        if today.day < self.next_due_date.day:
            months_late -= 1
        months_late = max(0, months_late) + 1

        if months_late <= self.months_overdue_penalized:
            return Decimal('0.00')

        # ── Triangular number: T(n) = n(n+1)/2 — ang pagkakaiba ng
        # T(bago) at T(dati) ay eksaktong ang TAMANG dagdag na penalty,
        # kahit tumalon nang maraming buwan sa isang tawag. ─────────────
        def triangular(n):
            return n * (n + 1) // 2

        prev_units = triangular(self.months_overdue_penalized)
        new_units  = triangular(months_late)
        added_units = new_units - prev_units  # bilang ng "units" ng monthly_due×2%

        penalty = (self.monthly_due * PENALTY_RATE * added_units).quantize(Decimal('0.01'))
        self.balance = self.balance + penalty
        self.months_overdue_penalized = months_late
        self.status = 'Overdue'
        self.save(update_fields=['balance', 'months_overdue_penalized', 'status'])
        return penalty


# ── Add this to loans/models.py at the bottom ────────────────────────────────

class GCashPaymentRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending',  'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    ]

    loan            = models.ForeignKey('Loan',   on_delete=models.CASCADE, related_name='gcash_requests')
    member          = models.ForeignKey('members.Member', on_delete=models.CASCADE, related_name='gcash_requests')
    amount          = models.DecimalField(max_digits=12, decimal_places=2)
    reference_number= models.CharField(max_length=20)
    screenshot_url  = models.URLField(max_length=500, blank=True)
    # ── BAGO: kung aling GCash account ang ginamit ng member (dahil
    # marami na ngayong puwedeng piliin) — plain text lang ito (hindi
    # FK papuntang GCashAccount), para hindi masira ang record na 'to
    # kahit ma-delete o mabago pa ang account sa hinaharap. ─────────────
    paid_to_number  = models.CharField(max_length=20, blank=True)
    paid_to_name    = models.CharField(max_length=100, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    note            = models.CharField(max_length=200, blank=True)
    verified_by     = models.CharField(max_length=100, blank=True)
    verified_at     = models.DateTimeField(null=True, blank=True)
    reject_reason   = models.CharField(max_length=200, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gcash_payment_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f'GCash {self.reference_number} — {self.member.fullname} ₱{self.amount} ({self.status})'
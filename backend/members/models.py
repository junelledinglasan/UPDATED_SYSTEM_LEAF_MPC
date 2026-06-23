from django.db import models
from django.utils import timezone
from auth_app.models import User


# ══════════════════════════════════════════════════════════════════
# TABLE 1: leaf_members_info
# ══════════════════════════════════════════════════════════════════
class LeafMemberInfo(models.Model):
    CIVIL_STATUS_CHOICES = [
        ('Single',    'Single'),
        ('Married',   'Married'),
        ('Widowed',   'Widowed'),
        ('Separated', 'Separated'),
    ]
    STATUS_CHOICES = [
        ('Pending',  'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    CLASSIFICATION_CHOICES = [
        ('Student',  'Student'),
        ('Senior',   'Senior'),
        ('Employed', 'Employed'),
    ]

    user                   = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='leaf_info')
    app_id                 = models.CharField(max_length=20, unique=True, blank=True)
    first_name             = models.CharField(max_length=100)
    last_name              = models.CharField(max_length=100)
    middle_name            = models.CharField(max_length=100, blank=True)
    birth_date             = models.DateField(null=True, blank=True)
    civil_status           = models.CharField(max_length=20, choices=CIVIL_STATUS_CHOICES, default='Single')
    educational_attainment = models.CharField(max_length=100, blank=True)
    occupation             = models.CharField(max_length=100, blank=True)
    income                 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    contact_number         = models.CharField(max_length=20, blank=True)
    email                  = models.EmailField(max_length=100, blank=True)
    address                = models.TextField(blank=True)
    classification         = models.CharField(max_length=20, choices=CLASSIFICATION_CHOICES, default='Employed')
    birth_certificate      = models.BooleanField(default=False)
    marriage_certificate   = models.BooleanField(default=False)
    application_status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reviewed_at            = models.DateTimeField(null=True, blank=True)
    reviewed_by            = models.CharField(max_length=100, blank=True)
    reject_reason          = models.TextField(blank=True)
    is_f2f                 = models.BooleanField(default=False)
    created_at             = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'leaf_members_info'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.application_status})'

    @property
    def fullname(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p).strip()

    def save(self, *args, **kwargs):
        if not self.app_id:
            year     = timezone.now().year
            prefix   = f'OA-{year}-'
            existing = LeafMemberInfo.objects.filter(
                app_id__startswith=prefix
            ).values_list('app_id', flat=True)
            max_num = 0
            for aid in existing:
                try:
                    num = int(aid.replace(prefix, ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
            candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            while LeafMemberInfo.objects.filter(app_id=candidate).exists():
                max_num += 1
                candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            self.app_id = candidate
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════
# TABLE NEW: online_applications
# Separate table para sa mga nag-online apply
# Kapag na-approve at na-convert → nananatili dito as Approved, hindi nadi-delete
# ══════════════════════════════════════════════════════════════════
class OnlineApplication(models.Model):
    CIVIL_STATUS_CHOICES = [
        ('Single',    'Single'),
        ('Married',   'Married'),
        ('Widowed',   'Widowed'),
        ('Separated', 'Separated'),
    ]
    STATUS_CHOICES = [
        ('Pending',  'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    CLASSIFICATION_CHOICES = [
        ('Student',  'Student'),
        ('Senior',   'Senior'),
        ('Employed', 'Employed'),
    ]

    user                   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='online_application')
    app_id                 = models.CharField(max_length=20, unique=True, blank=True)
    first_name             = models.CharField(max_length=100)
    last_name              = models.CharField(max_length=100)
    middle_name            = models.CharField(max_length=100, blank=True)
    birth_date             = models.DateField(null=True, blank=True)
    civil_status           = models.CharField(max_length=20, choices=CIVIL_STATUS_CHOICES, default='Single')
    educational_attainment = models.CharField(max_length=100, blank=True)
    occupation             = models.CharField(max_length=100, blank=True)
    income                 = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    contact_number         = models.CharField(max_length=20, blank=True)
    email                  = models.EmailField(max_length=100, blank=True)
    address                = models.TextField(blank=True)
    classification         = models.CharField(max_length=20, choices=CLASSIFICATION_CHOICES, default='Employed')
    birth_certificate      = models.BooleanField(default=False)
    marriage_certificate   = models.BooleanField(default=False)
    application_status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reviewed_at            = models.DateTimeField(null=True, blank=True)
    reviewed_by            = models.CharField(max_length=100, blank=True)
    reject_reason          = models.TextField(blank=True)
    plain_password         = models.CharField(max_length=100, blank=True)  # ── para makita ng admin
    created_at             = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'online_applications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.app_id} — {self.first_name} {self.last_name} ({self.application_status})'

    @property
    def fullname(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(p for p in parts if p).strip()

    def save(self, *args, **kwargs):
        if not self.app_id:
            year     = timezone.now().year
            prefix   = f'ONL-{year}-'
            existing = OnlineApplication.objects.filter(
                app_id__startswith=prefix
            ).values_list('app_id', flat=True)
            max_num = 0
            for aid in existing:
                try:
                    num = int(aid.replace(prefix, ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
            candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            while OnlineApplication.objects.filter(app_id=candidate).exists():
                max_num += 1
                candidate = f'{prefix}{str(max_num + 1).zfill(3)}'
            self.app_id = candidate
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════
# TABLE 2: members
# ══════════════════════════════════════════════════════════════════
class Member(models.Model):
    STATUS_CHOICES = [
        ('Active',    'Active'),
        ('Inactive',  'Inactive'),
        ('Suspended', 'Suspended'),
    ]

    user              = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='member')
    pre_member        = models.OneToOneField(LeafMemberInfo, on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_member')
    member_id         = models.CharField(max_length=20, unique=True, blank=True)
    membership_date   = models.DateField(auto_now_add=True)
    membership_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    share_capital     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    plain_password    = models.CharField(max_length=100, blank=True)
    date_registered   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'members'
        ordering = ['-date_registered']

    def __str__(self):
        return f'{self.member_id} — {self.fullname}'

    @property
    def fullname(self):
        if self.pre_member:
            return self.pre_member.fullname
        return self.user.name if self.user else '—'

    @property
    def first_name(self):
        return self.pre_member.first_name if self.pre_member else ''

    @property
    def last_name(self):
        return self.pre_member.last_name if self.pre_member else ''

    @property
    def contact(self):
        return self.pre_member.contact_number if self.pre_member else ''

    @property
    def email(self):
        if self.pre_member and self.pre_member.email:
            return self.pre_member.email
        return ''

    @property
    def status(self):
        return self.membership_status

    @property
    def classification(self):
        return self.pre_member.classification if self.pre_member else ''

    @property
    def max_loanable(self):
        # ── FIX: share_capital = amount paid, max loanable = share_capital × 2 ──
        return float(self.share_capital) * 2

    @property
    def application_id(self):
        return self.pre_member.id if self.pre_member else None

    def save(self, *args, **kwargs):
        if not self.member_id:
            existing = Member.objects.filter(
                member_id__startswith='LEAF-'
            ).values_list('member_id', flat=True)
            max_num = 0
            for mid in existing:
                try:
                    num = int(mid.replace('LEAF-', ''))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
            candidate = f'LEAF-{str(max_num + 1).zfill(3)}'
            while Member.objects.filter(member_id=candidate).exists():
                max_num += 1
                candidate = f'LEAF-{str(max_num + 1).zfill(3)}'
            self.member_id = candidate
        super().save(*args, **kwargs)


# ══════════════════════════════════════════════════════════════════
# TABLE 3: student_profiles
# ══════════════════════════════════════════════════════════════════
class StudentProfile(models.Model):
    member      = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='student_profile')
    school_name = models.CharField(max_length=200)
    year_level  = models.CharField(max_length=50)
    allowance   = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'student_profiles'

    def __str__(self):
        return f'{self.member.fullname} — Student'


# ══════════════════════════════════════════════════════════════════
# TABLE 4: senior_profiles
# ══════════════════════════════════════════════════════════════════
class SeniorProfile(models.Model):
    member                 = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='senior_profile')
    educational_attainment = models.CharField(max_length=100, blank=True)
    pension_income         = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'senior_profiles'

    def __str__(self):
        return f'{self.member.fullname} — Senior'


# ══════════════════════════════════════════════════════════════════
# TABLE 5: job_profiles
# ══════════════════════════════════════════════════════════════════
class JobProfile(models.Model):
    JOB_TYPE_CHOICES = [
        ('Employed',      'Employed'),
        ('Self-Employed', 'Self-Employed'),
        ('Business',      'Business'),
        ('Freelance',     'Freelance'),
        ('Other',         'Other'),
    ]

    member         = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='job_profile')
    occupation     = models.CharField(max_length=100)
    job_type       = models.CharField(max_length=30, choices=JOB_TYPE_CHOICES, default='Employed')
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'job_profiles'

    def __str__(self):
        return f'{self.member.fullname} — {self.job_type}'


# ══════════════════════════════════════════════════════════════════
# TABLE 6: savings
# ══════════════════════════════════════════════════════════════════
class Savings(models.Model):
    TRANSACTION_TYPE_CHOICES = [
        ('Deposit',  'Deposit'),
        ('Withdraw', 'Withdraw'),
    ]

    member           = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='savings')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    note             = models.CharField(max_length=200, blank=True)
    recorded_by      = models.CharField(max_length=100, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'savings'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.transaction_type} ₱{self.amount} — {self.member.fullname}'
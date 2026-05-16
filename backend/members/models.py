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
    address                = models.TextField(blank=True)
    classification         = models.CharField(max_length=20, choices=CLASSIFICATION_CHOICES, default='Employed')
    birth_certificate      = models.BooleanField(default=False)
    marriage_certificate   = models.BooleanField(default=False)
    application_status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reviewed_at            = models.DateTimeField(null=True, blank=True)
    reviewed_by            = models.CharField(max_length=100, blank=True)
    reject_reason          = models.TextField(blank=True)
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
            year        = timezone.now().year
            count       = LeafMemberInfo.objects.count() + 1
            self.app_id = f'OA-{year}-{str(count).zfill(3)}'
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
    membership_date   = models.DateField(default=timezone.localdate, editable=False)
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
        return self.user.email if self.user else ''

    @property
    def status(self):
        return self.membership_status

    @property
    def classification(self):
        return self.pre_member.classification if self.pre_member else ''

    @property
    def max_loanable(self):
        return float(self.share_capital) * 3

    @property
    def application_id(self):
        return self.pre_member.id if self.pre_member else None

    def save(self, *args, **kwargs):
        if not self.member_id:
            count          = Member.objects.count() + 1
            self.member_id = f'LEAF-{str(count).zfill(3)}'
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
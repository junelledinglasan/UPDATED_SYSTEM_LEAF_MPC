from django.db import models
from django.utils import timezone
from auth_app.models import User


class MembershipApplication(models.Model):
    """
    Sinumang nag-register online.
    May login account na pero limited access pa lang.
    """
    STATUS_CHOICES = [
        ('Pending',  'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    user         = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='application',
        null=True, blank=True
    )
    app_id       = models.CharField(max_length=20, unique=True, blank=True)

    # Personal Info
    firstname    = models.CharField(max_length=50)
    lastname     = models.CharField(max_length=50)
    middlename   = models.CharField(max_length=50, blank=True)
    birthdate    = models.DateField()
    gender       = models.CharField(max_length=10)
    civil_status = models.CharField(max_length=15)
    contact      = models.CharField(max_length=15)
    email        = models.EmailField(blank=True)
    address      = models.TextField()
    occupation   = models.CharField(max_length=100)

    # Valid ID
    valid_id     = models.CharField(max_length=50)
    id_number    = models.CharField(max_length=50, blank=True)

    # Beneficiary
    beneficiary  = models.CharField(max_length=100, blank=True)
    relationship = models.CharField(max_length=50,  blank=True)

    # Status
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    submitted_at  = models.DateTimeField(auto_now_add=True)
    reviewed_at   = models.DateTimeField(null=True, blank=True)
    reviewed_by   = models.CharField(max_length=50, blank=True)
    reject_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'membership_applications'
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.app_id} — {self.lastname}, {self.firstname} ({self.status})'

    @property
    def fullname(self):
        return f'{self.firstname} {self.lastname}'

    def save(self, *args, **kwargs):
        if not self.app_id:
            count       = MembershipApplication.objects.count() + 1
            year        = timezone.now().year
            self.app_id = f'OA-{year}-{str(count).zfill(3)}'
        super().save(*args, **kwargs)


class Member(models.Model):
    """
    Official members only — approved at bumisita na sa opisina.
    """
    STATUS_CHOICES = [
        ('Active',    'Active'),
        ('Inactive',  'Inactive'),
        ('Suspended', 'Suspended'),
    ]
    GENDER_CHOICES = [
        ('Male',   'Male'),
        ('Female', 'Female'),
        ('Other',  'Other'),
    ]
    CIVIL_CHOICES = [
        ('Single',    'Single'),
        ('Married',   'Married'),
        ('Widowed',   'Widowed'),
        ('Separated', 'Separated'),
    ]

    user         = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='member_profile'
    )
    application  = models.OneToOneField(
        MembershipApplication, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='converted_member'
    )
    member_id    = models.CharField(max_length=20, unique=True, blank=True)

    # Personal Info
    firstname    = models.CharField(max_length=50)
    lastname     = models.CharField(max_length=50)
    middlename   = models.CharField(max_length=50, blank=True)
    birthdate    = models.DateField()
    gender       = models.CharField(max_length=10, choices=GENDER_CHOICES)
    civil_status = models.CharField(max_length=15, choices=CIVIL_CHOICES)
    contact      = models.CharField(max_length=15)
    email        = models.EmailField(blank=True)
    address      = models.TextField()
    occupation   = models.CharField(max_length=100)

    # Valid ID
    valid_id     = models.CharField(max_length=50)
    id_number    = models.CharField(max_length=50, blank=True)

    # Beneficiary
    beneficiary  = models.CharField(max_length=100, blank=True)
    relationship = models.CharField(max_length=50,  blank=True)

    # Financial
    share_capital = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Active')

    # Plain password — visible to admin for giving credentials to member
    plain_password = models.CharField(max_length=100, blank=True, default='')

    # Timestamps
    date_registered = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'members'
        ordering = ['-date_registered']

    def __str__(self):
        return f'{self.member_id} — {self.lastname}, {self.firstname}'

    @property
    def fullname(self):
        return f'{self.firstname} {self.lastname}'

    @property
    def max_loanable(self):
        return float(self.share_capital) * 3

    def save(self, *args, **kwargs):
        if not self.member_id:
            count         = Member.objects.count() + 1
            self.member_id = f'LEAF-{str(count).zfill(3)}'
        super().save(*args, **kwargs)
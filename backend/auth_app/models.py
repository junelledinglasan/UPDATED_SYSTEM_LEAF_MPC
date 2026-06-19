from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):

    def create_user(self, username, password=None, **extra):
        if not username:
            raise ValueError('Username is required.')
        user = self.model(username=username, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        extra.setdefault('role',         'admin')
        extra.setdefault('is_staff',     True)
        extra.setdefault('is_superuser', True)
        return self.create_user(username, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):

    ROLES = [
        ('admin',  'Admin'),
        ('staff',  'Staff'),
        ('member', 'Member'),
        ('user',   'User'),   # ── FIX: registered but not yet official member
    ]

    STAFF_ROLES = [
        ('cashier',     'Cashier'),
        ('collector',   'Collector'),
        ('admin_clerk', 'Administrative Clerk'),
    ]

    username   = models.CharField(max_length=50, unique=True)
    name       = models.CharField(max_length=100)
    role       = models.CharField(max_length=10, choices=ROLES, default='user')  # ── FIX: default 'user'
    staff_role = models.CharField(max_length=20, choices=STAFF_ROLES, blank=True, null=True)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['name', 'role']

    class Meta:
        db_table = 'users'

    def __str__(self):
        if self.staff_role:
            return f'{self.username} ({self.role} - {self.staff_role})'
        return f'{self.username} ({self.role})'
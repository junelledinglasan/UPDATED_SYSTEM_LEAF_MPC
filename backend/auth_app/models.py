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
    ]

    username   = models.CharField(max_length=50, unique=True)
    name       = models.CharField(max_length=100)
    role       = models.CharField(max_length=10, choices=ROLES, default='member')
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['name', 'role']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.username} ({self.role})'
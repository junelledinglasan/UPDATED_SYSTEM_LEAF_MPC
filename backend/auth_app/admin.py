from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as Base
from .models import User


@admin.register(User)
class UserAdmin(Base):
    list_display  = ['username', 'name', 'role', 'is_active', 'created_at']
    list_filter   = ['role', 'is_active']
    search_fields = ['username', 'name']
    ordering      = ['-created_at']
    fieldsets     = (
        (None,          {'fields': ('username', 'password')}),
        ('Info',        {'fields': ('name', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('username', 'name', 'role', 'password1', 'password2'),
        }),
    )
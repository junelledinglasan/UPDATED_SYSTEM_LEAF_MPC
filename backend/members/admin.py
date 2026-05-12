from django.contrib import admin
from .models import Member, MembershipApplication


@admin.register(MembershipApplication)
class ApplicationAdmin(admin.ModelAdmin):
    list_display  = ['app_id', 'lastname', 'firstname', 'status', 'submitted_at']
    list_filter   = ['status']
    search_fields = ['app_id', 'firstname', 'lastname', 'contact']
    ordering      = ['-submitted_at']


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display  = ['member_id', 'lastname', 'firstname', 'status', 'share_capital', 'date_registered']
    list_filter   = ['status', 'gender']
    search_fields = ['member_id', 'firstname', 'lastname', 'contact']
    ordering      = ['-date_registered']
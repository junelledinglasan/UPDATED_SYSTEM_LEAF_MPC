from django.contrib import admin
from .models import LeafMemberInfo, Member, StudentProfile, SeniorProfile, JobProfile


@admin.register(LeafMemberInfo)
class LeafMemberInfoAdmin(admin.ModelAdmin):
    list_display  = ['app_id', 'first_name', 'last_name', 'classification', 'application_status', 'created_at']
    list_filter   = ['application_status', 'classification']
    search_fields = ['first_name', 'last_name', 'app_id', 'contact_number']
    ordering      = ['-created_at']      # LeafMemberInfo has created_at


class StudentProfileInline(admin.TabularInline):
    model = StudentProfile
    extra = 0


class SeniorProfileInline(admin.TabularInline):
    model = SeniorProfile
    extra = 0


class JobProfileInline(admin.TabularInline):
    model = JobProfile
    extra = 0


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display  = ['member_id', 'fullname', 'classification', 'membership_status', 'share_capital', 'membership_date']
    list_filter   = ['membership_status']
    search_fields = ['member_id', 'pre_member__first_name', 'pre_member__last_name']
    inlines       = [StudentProfileInline, SeniorProfileInline, JobProfileInline]
    ordering      = ['-date_registered']  # Member has date_registered
from django.contrib import admin
from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display  = ['action_type', 'description', 'performed_by', 'created_at']
    list_filter   = ['action_type']
    search_fields = ['description', 'performed_by__name']
    ordering      = ['-created_at']
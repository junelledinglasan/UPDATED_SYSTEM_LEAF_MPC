from django.contrib import admin
from .models import Announcement, AnnouncementComment


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display  = ['title', 'type', 'posted_by', 'is_active', 'created_at']
    list_filter   = ['type', 'is_active']
    search_fields = ['title', 'body']
    ordering      = ['-created_at']


@admin.register(AnnouncementComment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['announcement', 'posted_by', 'created_at']
    ordering     = ['-created_at']
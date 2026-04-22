from django.db import models
from auth_app.models import User


class Announcement(models.Model):
    TYPE_CHOICES = [
        ('Activity',     'Activity'),
        ('Seminar',      'Seminar'),
        ('Notice',       'Notice'),
        ('Announcement', 'Announcement'),
        ('Event',        'Event'),
    ]

    title      = models.CharField(max_length=200)
    body       = models.TextField()
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Notice')
    posted_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='announcements')
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type}: {self.title}'


class AnnouncementComment(models.Model):
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='comments')
    posted_by    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    body         = models.TextField()
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_comments'
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.posted_by.username}'
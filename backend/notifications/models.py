# backend/notifications/models.py — BAGONG FILE

from django.db import models
from auth_app.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ('payment',      'Payment'),
        ('loan',         'Loan'),
        ('membership',   'Membership'),
        ('announcement', 'Announcement'),
        ('general',      'General'),
    ]

    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    notif_type  = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} → {self.user.username}'
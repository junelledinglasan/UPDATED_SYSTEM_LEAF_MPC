from django.db import models
from auth_app.models import User


class ActivityLog(models.Model):

    ACTION_TYPES = [
        ('payment',       'Payment'),
        ('application',   'Application'),
        ('member',        'Member'),
        ('loan',          'Loan'),
        ('announcement',  'Announcement'),
        ('staff',         'Staff'),
        ('login',         'Login'),
        ('other',         'Other'),
    ]

    action_type  = models.CharField(max_length=20, choices=ACTION_TYPES, default='other')
    description  = models.TextField()
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='activity_logs'
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.action_type}] {self.description}'
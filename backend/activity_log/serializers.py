from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(
        source='performed_by.name', read_only=True
    )
    performed_by_role = serializers.CharField(
        source='performed_by.role', read_only=True
    )

    class Meta:
        model  = ActivityLog
        fields = [
            'id', 'action_type', 'description',
            'performed_by', 'performed_by_name', 'performed_by_role',
            'created_at',
        ]
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import ActivityLog
from .serializers import ActivityLogSerializer


# Dot colors for frontend
ACTION_TYPE_MAP = {
    'payment':      'payment',
    'application':  'application',
    'member':       'register',
    'loan':         'pending',
    'announcement': 'application',
    'staff':        'register',
    'login':        'application',
    'other':        'other',
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_log_list_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    limit = int(request.query_params.get('limit', 20))
    logs  = ActivityLog.objects.all().select_related('performed_by')[:limit]

    result = []
    now = timezone.now()
    for log in logs:
        # Format time nicely
        diff = now - log.created_at
        if diff.days == 0:
            if diff.seconds < 3600:
                mins = diff.seconds // 60
                time_str = f"{mins} minute{'s' if mins != 1 else ''} ago" if mins > 0 else "Just now"
            else:
                hrs = diff.seconds // 3600
                time_str = f"{hrs} hour{'s' if hrs != 1 else ''} ago"
        elif diff.days == 1:
            time_str = f"Yesterday, {log.created_at.strftime('%I:%M %p')}"
        else:
            time_str = log.created_at.strftime('%b %d, %I:%M %p')

        result.append({
            'id':           log.id,
            'type':         ACTION_TYPE_MAP.get(log.action_type, 'other'),
            'action_type':  log.action_type,
            'text':         log.description,
            'time':         time_str,
            'performed_by': log.performed_by.name if log.performed_by else 'System',
            'created_at':   log.created_at,
        })

    return Response(result)
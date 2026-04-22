from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ActivityLog
from .serializers import ActivityLogSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_log_list_view(request):
    """Get recent activity logs — admin/staff only."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    limit = int(request.query_params.get('limit', 20))
    logs  = ActivityLog.objects.all()[:limit]
    return Response(ActivityLogSerializer(logs, many=True).data)
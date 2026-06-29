# backend/notifications/views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list_view(request):
    notifs = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
    return Response([{
        'id':         n.id,
        'title':      n.title,
        'message':    n.message,
        'notif_type': n.notif_type,
        'is_read':    n.is_read,
        'created_at': n.created_at.strftime('%Y-%m-%d %H:%M'),
    } for n in notifs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_read_view(request, pk):
    try:
        notif = Notification.objects.get(pk=pk, user=request.user)
        notif.is_read = True
        notif.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read_view(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count_view(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'count': count})
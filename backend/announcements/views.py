from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from activity_log.utils import log_activity
from .models import Announcement, AnnouncementComment
from .serializers import AnnouncementSerializer, CommentSerializer


@api_view(['GET', 'POST'])
def announcement_list_view(request):
    if request.method == 'GET':
        anns = Announcement.objects.filter(is_active=True)
        if t := request.query_params.get('type'):
            anns = anns.filter(type=t)
        return Response(AnnouncementSerializer(anns, many=True).data)

    # POST
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=401)
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    s = AnnouncementSerializer(data=request.data)
    if s.is_valid():
        ann = s.save(posted_by=request.user)
        log_activity('announcement', f'Announcement posted: "{ann.title}" by {request.user.name}', request.user)
        return Response(AnnouncementSerializer(ann).data, status=201)

    print("[ANNOUNCEMENT CREATE ERROR]", s.errors)
    return Response(s.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
def announcement_detail_view(request, pk):
    try:
        ann = Announcement.objects.get(pk=pk)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(AnnouncementSerializer(ann).data)

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=401)

    if request.method == 'PUT':
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized.'}, status=403)
        s = AnnouncementSerializer(ann, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            log_activity('announcement', f'Announcement updated: "{ann.title}" by {request.user.name}', request.user)
            return Response(AnnouncementSerializer(ann).data)
        print("[ANNOUNCEMENT UPDATE ERROR]", s.errors)
        return Response(s.errors, status=400)

    if request.method == 'DELETE':
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)
        title = ann.title
        ann.delete()
        log_activity('announcement', f'Announcement deleted: "{title}" by {request.user.name}', request.user)
        return Response({'message': 'Deleted.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment_view(request, pk):
    try:
        ann = Announcement.objects.get(pk=pk)
    except Announcement.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    body = request.data.get('body', '').strip()
    if not body:
        return Response({'error': 'Comment cannot be empty.'}, status=400)

    comment = AnnouncementComment.objects.create(
        announcement=ann,
        posted_by=request.user,
        body=body,
    )
    log_activity('announcement', f'{request.user.name} commented on: "{ann.title}"', request.user)
    return Response(CommentSerializer(comment).data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment_view(request, pk, comment_pk):
    try:
        c = AnnouncementComment.objects.get(pk=comment_pk, announcement__pk=pk)
    except AnnouncementComment.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.user != c.posted_by and request.user.role != 'admin':
        return Response({'error': 'Unauthorized.'}, status=403)

    c.delete()
    return Response({'message': 'Deleted.'})
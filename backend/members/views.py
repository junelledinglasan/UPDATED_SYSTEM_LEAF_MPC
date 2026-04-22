from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.models import User
from activity_log.utils import log_activity
from .models import Member, MembershipApplication
from .serializers import (
    MemberSerializer, MemberListSerializer,
    MembershipApplicationSerializer, MembershipApplicationListSerializer,
)


# ══════════════════════════════════════════════════════════════════
# MEMBERSHIP APPLICATIONS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def application_list_view(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=401)
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized.'}, status=403)
        apps = MembershipApplication.objects.all()
        if s := request.query_params.get('status'):
            apps = apps.filter(status=s)
        if q := request.query_params.get('search', '').strip():
            apps = apps.filter(lastname__icontains=q) | \
                   apps.filter(firstname__icontains=q) | \
                   apps.filter(app_id__icontains=q)
        return Response(MembershipApplicationListSerializer(apps, many=True).data)

    # POST — submit application (public)
    user = request.user if request.user.is_authenticated else None
    s = MembershipApplicationSerializer(data=request.data)
    if s.is_valid():
        app = s.save(user=user)
        log_activity(
            'application',
            f'New online application received from {app.fullname} ({app.app_id})',
            user
        )
        return Response(MembershipApplicationSerializer(app).data, status=201)
    return Response(s.errors, status=400)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def application_detail_view(request, pk):
    try:
        app = MembershipApplication.objects.get(pk=pk)
    except MembershipApplication.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(MembershipApplicationSerializer(app).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    new_status = request.data.get('status')
    if new_status in ['Approved', 'Rejected']:
        app.status      = new_status
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user.username
        if new_status == 'Rejected':
            app.reject_reason = request.data.get('reject_reason', '')
        app.save()

        log_activity(
            'application',
            f'Application {app.app_id} ({app.fullname}) was {new_status.lower()} by {request.user.name}',
            request.user
        )

    return Response(MembershipApplicationSerializer(app).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_application_view(request):
    try:
        app = MembershipApplication.objects.get(user=request.user)
        return Response(MembershipApplicationSerializer(app).data)
    except MembershipApplication.DoesNotExist:
        return Response({'error': 'No application found.'}, status=404)


# ══════════════════════════════════════════════════════════════════
# CONVERT APPLICATION → OFFICIAL MEMBER
# ══════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_member_view(request, pk):
    """
    Converts an approved application to an official member.
    - Creates Member record
    - Updates User.role = 'member' for full access
    """
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    try:
        app = MembershipApplication.objects.get(pk=pk, status='Approved')
    except MembershipApplication.DoesNotExist:
        return Response({'error': 'Approved application not found.'}, status=404)

    # Check if already converted
    if hasattr(app, 'converted_member'):
        return Response({'error': 'Already converted to official member.'}, status=400)

    user = app.user

    if not user:
        import random, string
        fn    = app.firstname.lower().strip()
        ln    = app.lastname.lower().strip()
        base  = f'{fn}.{ln}'
        uname = base
        i = 1
        while User.objects.filter(username=uname).exists():
            uname = f'{base}{i}'; i += 1

        plain_pw = 'leaf' + ''.join(random.choices(string.digits, k=4))
        name     = f'{app.firstname} {app.lastname}'.strip()
        user     = User.objects.create_user(
            username=uname,
            password=plain_pw,
            name=name,
            role='member',
        )
        app.user = user
        app.save()
    else:
        # Grant full member access
        user.role      = 'member'
        user.name      = f'{app.firstname} {app.lastname}'.strip()
        user.is_active = True
        user.save()
        plain_pw = request.data.get('plain_password', '')

    # Create official Member record
    member = Member.objects.create(
        user          = user,
        application   = app,
        firstname     = app.firstname,
        lastname      = app.lastname,
        middlename    = app.middlename,
        birthdate     = app.birthdate,
        gender        = app.gender,
        civil_status  = app.civil_status,
        contact       = app.contact,
        email         = app.email,
        address       = app.address,
        occupation    = app.occupation,
        valid_id      = app.valid_id,
        id_number     = app.id_number,
        beneficiary   = app.beneficiary,
        relationship  = app.relationship,
        plain_password= plain_pw,
        status        = 'Active',
    )

    log_activity(
        'member',
        f'Member registered: {member.fullname} ({member.member_id}) — converted from application {app.app_id}',
        request.user
    )

    return Response({
        'message':   f'{member.fullname} is now an official member!',
        'member_id': member.member_id,
        'username':  user.username,
        'member':    MemberSerializer(member).data,
    }, status=201)


# ══════════════════════════════════════════════════════════════════
# OFFICIAL MEMBERS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def member_list_view(request):
    if request.method == 'GET':
        members = Member.objects.all()
        if s := request.query_params.get('status'):
            members = members.filter(status=s)
        if q := request.query_params.get('search', '').strip():
            members = members.filter(lastname__icontains=q)  | \
                      members.filter(firstname__icontains=q)  | \
                      members.filter(member_id__icontains=q)
        return Response(MemberListSerializer(members, many=True).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    import random, string
    data = request.data.copy()
    plain_password = data.get('plain_password', '')
    if not plain_password:
        plain_password = 'leaf' + ''.join(random.choices(string.digits, k=4))

    fn    = data.get('firstname', '').lower().strip()
    ln    = data.get('lastname',  '').lower().strip()
    base  = f'{fn}.{ln}'
    uname = base
    i = 1
    while User.objects.filter(username=uname).exists():
        uname = f'{base}{i}'; i += 1

    name = f"{data.get('firstname','')} {data.get('lastname','')}".strip()
    user = User.objects.create_user(
        username=uname,
        password=plain_password,
        name=name,
        role='member',
    )

    s = MemberSerializer(data=data)
    if s.is_valid():
        member = s.save(user=user, plain_password=plain_password)
        log_activity(
            'member',
            f'New member registered: {member.fullname} ({member.member_id})',
            request.user
        )
        return Response(MemberSerializer(member).data, status=201)

    user.delete()
    return Response(s.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def member_detail_view(request, pk):
    try:
        member = Member.objects.get(pk=pk)
    except Member.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(MemberSerializer(member).data)

    if request.method == 'PUT':
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized.'}, status=403)
        data   = request.data.copy()
        new_pw = data.get('plain_password', '')
        if new_pw and member.user:
            member.user.set_password(new_pw)
            member.user.save()
        s = MemberSerializer(member, data=data, partial=True)
        if s.is_valid():
            s.save()
            log_activity(
                'member',
                f'Member updated: {member.fullname} ({member.member_id})',
                request.user
            )
            return Response(s.data)
        return Response(s.errors, status=400)

    if request.method == 'DELETE':
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)
        log_activity(
            'member',
            f'Member deleted: {member.fullname} ({member.member_id})',
            request.user
        )
        member.delete()
        return Response({'message': 'Member deleted.'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def member_status_view(request, pk):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    try:
        member = Member.objects.get(pk=pk)
    except Member.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)
    if st := request.data.get('status'):
        old_status    = member.status
        member.status = st
        member.save()
        log_activity(
            'member',
            f'Member status changed: {member.fullname} ({member.member_id}) {old_status} → {st}',
            request.user
        )
    return Response(MemberSerializer(member).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_stats_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    return Response({
        'total':                  Member.objects.count(),
        'active':                 Member.objects.filter(status='Active').count(),
        'inactive':               Member.objects.filter(status='Inactive').count(),
        'suspended':              Member.objects.filter(status='Suspended').count(),
        'pending_applications':   MembershipApplication.objects.filter(status='Pending').count(),
        'approved_applications':  MembershipApplication.objects.filter(status='Approved').count(),
        'total_applications':     MembershipApplication.objects.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_profile_view(request):
    try:
        member = Member.objects.get(user=request.user)
        return Response(MemberSerializer(member).data)
    except Member.DoesNotExist:
        return Response({'error': 'Not an official member yet.'}, status=404)
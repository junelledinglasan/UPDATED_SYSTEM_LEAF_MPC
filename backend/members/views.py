import random, string
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from auth_app.models import User
from activity_log.utils import log_activity
from .models import LeafMemberInfo, Member, StudentProfile, SeniorProfile, JobProfile
from .serializers import (
    LeafMemberInfoSerializer, LeafMemberInfoListSerializer,
    MemberSerializer, MemberListSerializer,
)


# ── Helpers ────────────────────────────────────────────────────────────────────
def gen_password():
    return 'leaf' + ''.join(random.choices(string.digits, k=4))


def gen_username(first_name, last_name):
    base  = f'{first_name.lower().strip()}.{last_name.lower().strip()}'
    uname = base
    i = 1
    while User.objects.filter(username=uname).exists():
        uname = f'{base}{i}'
        i    += 1
    return uname


def save_sub_profile(member, classification, data):
    """Create or update the sub-profile based on classification."""
    if classification == 'Student':
        StudentProfile.objects.update_or_create(
            member=member,
            defaults={
                'school_name': data.get('school_name', ''),
                'year_level':  data.get('year_level', ''),
                'allowance':   data.get('allowance', 0) or 0,
            }
        )
    elif classification == 'Senior':
        SeniorProfile.objects.update_or_create(
            member=member,
            defaults={
                'educational_attainment': data.get('educational_attainment', ''),
                'pension_income':         data.get('pension_income', 0) or 0,
            }
        )
    elif classification == 'Employed':
        JobProfile.objects.update_or_create(
            member=member,
            defaults={
                'occupation':     data.get('occupation', ''),
                'job_type':       data.get('job_type', 'Employed'),
                'monthly_income': data.get('monthly_income', 0) or 0,
            }
        )


# ══════════════════════════════════════════════════════════════════
# APPLICATIONS — leaf_members_info
# ══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def application_list_view(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required.'}, status=401)
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized.'}, status=403)

        apps = LeafMemberInfo.objects.all()
        if s := request.query_params.get('status'):
            apps = apps.filter(application_status=s)
        if q := request.query_params.get('search', '').strip():
            apps = apps.filter(last_name__icontains=q)  | \
                   apps.filter(first_name__icontains=q)  | \
                   apps.filter(app_id__icontains=q)
        return Response(LeafMemberInfoListSerializer(apps, many=True).data)

    # POST — online application
    user = request.user if request.user.is_authenticated else None
    s    = LeafMemberInfoSerializer(data=request.data)
    if s.is_valid():
        info = s.save(user=user)
        log_activity('application', f'New application from {info.fullname} ({info.app_id})', user)
        return Response(LeafMemberInfoSerializer(info).data, status=201)
    return Response(s.errors, status=400)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def application_detail_view(request, pk):
    try:
        app = LeafMemberInfo.objects.get(pk=pk)
    except LeafMemberInfo.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(LeafMemberInfoSerializer(app).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    new_status = request.data.get('status') or request.data.get('application_status')
    if new_status in ['Approved', 'Rejected']:
        app.application_status = new_status
        app.reviewed_at        = timezone.now()
        app.reviewed_by        = request.user.username
        if new_status == 'Rejected':
            app.reject_reason = request.data.get('reject_reason', '')
        app.save()
        log_activity('application',
            f'Application {app.app_id} ({app.fullname}) {new_status.lower()} by {request.user.name}',
            request.user)
    return Response(LeafMemberInfoSerializer(app).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_application_view(request):
    try:
        app = LeafMemberInfo.objects.get(user=request.user)
        return Response(LeafMemberInfoSerializer(app).data)
    except LeafMemberInfo.DoesNotExist:
        return Response({'error': 'No application found.'}, status=404)


# ══════════════════════════════════════════════════════════════════
# CONVERT APPLICATION → OFFICIAL MEMBER
# ══════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_member_view(request, pk):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    try:
        info = LeafMemberInfo.objects.get(pk=pk)
    except LeafMemberInfo.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=404)

    if info.application_status != 'Approved':
        return Response({'error': 'Application must be Approved first.'}, status=400)

    # Check if already converted
    if Member.objects.filter(pre_member=info).exists():
        existing = Member.objects.get(pre_member=info)
        return Response({
            'error':     'Already converted to official member.',
            'member_id': existing.member_id,
        }, status=400)

    # Get or create user account
    user     = info.user
    plain_pw = gen_password()

    if not user:
        uname = gen_username(info.first_name, info.last_name)
        user  = User.objects.create_user(
            username=uname, password=plain_pw,
            name=info.fullname, role='member',
        )
        info.user = user
        info.save()
    else:
        user.role      = 'member'
        user.name      = info.fullname
        user.is_active = True
        user.set_password(plain_pw)
        user.save()

    try:
        member = Member.objects.create(
            user              = user,
            pre_member        = info,
            membership_status = 'Active',
            plain_password    = plain_pw,
        )
    except Exception as e:
        return Response({'error': f'Failed to create member: {str(e)}'}, status=500)

    # Create sub-profile
    save_sub_profile(member, info.classification, request.data)

    log_activity('member',
        f'Member converted: {member.fullname} ({member.member_id}) from {info.app_id}',
        request.user)

    return Response({
        'message':   f'{member.fullname} is now an official member!',
        'member_id': member.member_id,
        'username':  user.username,
        'password':  plain_pw,
        'member':    MemberSerializer(member).data,
    }, status=201)


# ══════════════════════════════════════════════════════════════════
# OFFICIAL MEMBERS — F2F Walk-in Registration
# ══════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def member_list_view(request):
    if request.method == 'GET':
        members = Member.objects.all()
        if s := request.query_params.get('status'):
            members = members.filter(membership_status=s)
        if q := request.query_params.get('search', '').strip():
            members = members.filter(pre_member__last_name__icontains=q)  | \
                      members.filter(pre_member__first_name__icontains=q) | \
                      members.filter(member_id__icontains=q)
        return Response(MemberListSerializer(members, many=True).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    data     = request.data
    plain_pw = gen_password()
    fname    = data.get('first_name', data.get('firstname', ''))
    lname    = data.get('last_name',  data.get('lastname',  ''))
    uname    = gen_username(fname, lname)

    user = User.objects.create_user(
        username=uname, password=plain_pw,
        name=f'{fname} {lname}'.strip(),
        role='member', is_active=True,
    )

    # Create LeafMemberInfo
    try:
        info = LeafMemberInfo.objects.create(
            user                   = user,
            first_name             = fname,
            last_name              = lname,
            middle_name            = data.get('middle_name', data.get('middlename', '')),
            birth_date             = data.get('birth_date',  data.get('birthdate')) or None,
            civil_status           = data.get('civil_status', 'Single'),
            educational_attainment = data.get('educational_attainment', ''),
            occupation             = data.get('occupation', ''),
            income                 = data.get('income', 0) or 0,
            contact_number         = data.get('contact_number', data.get('contact', '')),
            address                = data.get('address', ''),
            classification         = data.get('classification', 'Employed'),
            birth_certificate      = data.get('birth_certificate', False),
            marriage_certificate   = data.get('marriage_certificate', False),
            application_status     = 'Approved',
        )
    except Exception as e:
        user.delete()
        return Response({'error': f'Failed to create info: {str(e)}'}, status=500)

    # Create Member record
    try:
        member = Member.objects.create(
            user              = user,
            pre_member        = info,
            membership_status = 'Active',
            plain_password    = plain_pw,
        )
    except Exception as e:
        info.delete(); user.delete()
        return Response({'error': f'Failed to create member: {str(e)}'}, status=500)

    # Create sub-profile
    save_sub_profile(member, data.get('classification', 'Employed'), data)

    log_activity('member',
        f'New F2F member: {member.fullname} ({member.member_id}) by {request.user.name}',
        request.user)

    return Response({
        'message':        f'{member.fullname} is now an official member!',
        'member_id':      member.member_id,
        'username':       uname,
        'plain_password': plain_pw,
        'member':         MemberSerializer(member).data,
    }, status=201)


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
        data = request.data

        # Update LeafMemberInfo fields
        if member.pre_member:
            info = member.pre_member
            for field in [
                'first_name', 'last_name', 'middle_name', 'birth_date',
                'civil_status', 'educational_attainment', 'occupation',
                'income', 'contact_number', 'address',
                'birth_certificate', 'marriage_certificate',
            ]:
                if field in data:
                    setattr(info, field, data[field])
            info.save()

        # Update password
        if new_pw := data.get('plain_password', ''):
            member.user.set_password(new_pw)
            member.user.save()
            member.plain_password = new_pw

        # Update membership fields
        if ms := data.get('membership_status', data.get('status', '')):
            member.membership_status = ms
        if sc := data.get('share_capital'):
            member.share_capital = sc

        member.save()

        # Update sub-profile
        if member.pre_member:
            save_sub_profile(member, member.pre_member.classification, data)

        log_activity('member', f'Member updated: {member.fullname} ({member.member_id})', request.user)
        return Response(MemberSerializer(member).data)

    if request.method == 'DELETE':
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized.'}, status=403)
        name = member.fullname
        mid  = member.member_id
        member.delete()
        log_activity('member', f'Member deleted: {name} ({mid})', request.user)
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

    st = request.data.get('status') or request.data.get('membership_status')
    if st:
        old = member.membership_status
        member.membership_status = st
        member.save()
        log_activity('member', f'Member status: {member.fullname} {old} → {st}', request.user)
    return Response(MemberSerializer(member).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_stats_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    return Response({
        'total':                 Member.objects.count(),
        'active':                Member.objects.filter(membership_status='Active').count(),
        'inactive':              Member.objects.filter(membership_status='Inactive').count(),
        'suspended':             Member.objects.filter(membership_status='Suspended').count(),
        'pending_applications':  LeafMemberInfo.objects.filter(application_status='Pending').count(),
        'approved_applications': LeafMemberInfo.objects.filter(application_status='Approved').count(),
        'total_applications':    LeafMemberInfo.objects.count(),
        'students':              Member.objects.filter(pre_member__classification='Student').count(),
        'seniors':               Member.objects.filter(pre_member__classification='Senior').count(),
        'employed':              Member.objects.filter(pre_member__classification='Employed').count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_profile_view(request):
    try:
        member = Member.objects.get(user=request.user)
        return Response(MemberSerializer(member).data)
    except Member.DoesNotExist:
        return Response({'error': 'Not an official member yet.'}, status=404)
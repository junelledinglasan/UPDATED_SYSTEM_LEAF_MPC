from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from activity_log.utils import log_activity
from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CreateStaffSerializer,
    ResetPasswordSerializer,
)


def get_user_label(user):
    if user.role in ('admin', 'staff'):
        return user.role
    try:
        from members.models import Member
        Member.objects.get(user=user)
        return 'member'
    except Exception:
        return 'user'


# ─── Register (Create Account — public) ───────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username    = request.data.get('username', '').strip()
    password    = request.data.get('password', '')
    first_name  = request.data.get('first_name', '').strip()
    last_name   = request.data.get('last_name', '').strip()
    middle_name = request.data.get('middle_name', '').strip()

    if not username:
        return Response({'detail': 'Username is required.'}, status=400)
    if len(username) < 4:
        return Response({'detail': 'Username must be at least 4 characters.'}, status=400)
    if ' ' in username:
        return Response({'detail': 'Username cannot contain spaces.'}, status=400)
    if len(password) < 6:
        return Response({'detail': 'Password must be at least 6 characters.'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'username': ['Username already taken.']}, status=400)

    # ── Build full name from first/middle/last name ──
    if first_name or last_name:
        parts = [p for p in [first_name, middle_name, last_name] if p]
        full_name = ' '.join(parts)
    else:
        full_name = username

    user = User.objects.create_user(
        username=username,
        password=password,
        name=full_name,
        role='user',
    )

    # ── Save plain password sa OnlineApplication para makita ng admin ──
    try:
        from members.models import OnlineApplication
        OnlineApplication.objects.filter(user=user).update(plain_password=password)
    except Exception:
        pass

    log_activity('application', f'New account created: @{user.username} ({full_name})', user)
    return Response({'message': 'Account created successfully.'}, status=201)


# ─── Login ─────────────────────────────────────────────────────────────────────
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user_data = response.data.get('user', {})
            try:
                user  = User.objects.get(username=user_data.get('username'))
                label = get_user_label(user)
                log_activity('login', f'{user.name} ({label}) logged in', user)
            except Exception:
                pass
        return response


# ─── Logout ────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        label = get_user_label(request.user)
        log_activity('login', f'{request.user.name} ({label}) logged out', request.user)
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully.'})


# ─── Get Current User ──────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


# ─── Staff List + Create ───────────────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def staff_list_view(request):
    if request.user.role != 'admin':
        return Response({'error': 'Unauthorized.'}, status=403)

    if request.method == 'GET':
        staff = User.objects.filter(role='staff')
        return Response(UserSerializer(staff, many=True).data)

    s = CreateStaffSerializer(data=request.data)
    if s.is_valid():
        staff = s.save()
        log_activity('staff', f'New staff added: {staff.name} (@{staff.username})', request.user)
        return Response(UserSerializer(staff).data, status=201)
    return Response(s.errors, status=400)


# ─── Staff Edit + Delete ───────────────────────────────────────────────────────
@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def staff_detail_view(request, pk):
    if request.user.role != 'admin':
        return Response({'error': 'Unauthorized.'}, status=403)

    try:
        staff = User.objects.get(pk=pk, role='staff')
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)

    if request.method == 'PUT':
        staff.name     = request.data.get('name',     staff.name)
        staff.username = request.data.get('username', staff.username)
        staff.save()
        log_activity('staff', f'Staff updated: {staff.name} (@{staff.username})', request.user)
        return Response(UserSerializer(staff).data)

    log_activity('staff', f'Staff deleted: {staff.name} (@{staff.username})', request.user)
    staff.delete()
    return Response({'message': 'Staff deleted.'})


# ─── Reset Staff Password ──────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_staff_password_view(request, pk):
    if request.user.role != 'admin':
        return Response({'error': 'Unauthorized.'}, status=403)

    try:
        staff = User.objects.get(pk=pk, role='staff')
    except User.DoesNotExist:
        return Response({'error': 'Staff not found.'}, status=404)

    s = ResetPasswordSerializer(data=request.data)
    if s.is_valid():
        staff.set_password(s.validated_data['new_password'])
        staff.save()
        log_activity('staff', f'Password reset for staff: {staff.name} (@{staff.username})', request.user)
        return Response({'message': 'Password reset successfully.'})
    return Response(s.errors, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_me_view(request):
    user = request.user
    if new_username := request.data.get('username', '').strip():
        from auth_app.models import User
        if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
            return Response({'username': ['Username already taken.']}, status=400)
        user.username = new_username
        user.save()
    return Response({'username': user.username, 'message': 'Updated successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user    = request.user
    current = request.data.get('current_password', '')
    new_pw  = request.data.get('new_password', '')
    if not user.check_password(current):
        return Response({'detail': 'Current password is incorrect.'}, status=400)
    if len(new_pw) < 6:
        return Response({'detail': 'New password must be at least 6 characters.'}, status=400)
    user.password = new_pw  # ── Store plain text ──
    user.save()
    return Response({'message': 'Password changed successfully.'})
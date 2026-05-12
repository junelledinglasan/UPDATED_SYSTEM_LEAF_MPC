from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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


# ─── Login ─────────────────────────────────────────────────────────────────────
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user_data = response.data.get('user', {})
            try:
                user = User.objects.get(username=user_data.get('username'))
                log_activity('login', f'{user.name} ({user.role}) logged in', user)
            except Exception:
                pass
        return response


# ─── Logout ────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        log_activity('login', f'{request.user.name} ({request.user.role}) logged out', request.user)
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
    """Update own username."""
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
    """Change own password."""
    user = request.user
    current = request.data.get('current_password', '')
    new_pw  = request.data.get('new_password', '')
    if not user.check_password(current):
        return Response({'detail': 'Current password is incorrect.'}, status=400)
    if len(new_pw) < 6:
        return Response({'detail': 'New password must be at least 6 characters.'}, status=400)
    user.set_password(new_pw)
    user.save()
    return Response({'message': 'Password changed successfully.'})
 
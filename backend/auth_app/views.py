from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

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


# ─── Logout ────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
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
        return Response(UserSerializer(staff).data)

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
        return Response({'message': 'Password reset successfully.'})
    return Response(s.errors, status=400)
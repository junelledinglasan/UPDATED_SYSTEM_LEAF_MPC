from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from activity_log.utils import log_activity
from .models import Payment
from .serializers import PaymentSerializer, CreatePaymentSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_list_view(request):
    if request.method == 'GET':
        payments = Payment.objects.all()
        if request.user.role == 'member':
            payments = payments.filter(member__user=request.user)
        return Response(PaymentSerializer(payments, many=True).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    s = CreatePaymentSerializer(data=request.data, context={'request': request})
    if s.is_valid():
        payment = s.save()
        log_activity(
            'payment',
            f'Payment of ₱{payment.amount:,.2f} recorded for {payment.member.fullname} ({payment.member.member_id}) — Loan: {payment.loan.loan_id}',
            request.user
        )
        return Response(PaymentSerializer(payment).data, status=201)
    return Response(s.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_stats_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    return Response({
        'total_collected':   float(Payment.objects.aggregate(t=Sum('amount'))['t'] or 0),
        'transaction_count': Payment.objects.count(),
    })
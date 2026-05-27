from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from activity_log.utils import log_activity
from .models import Payment
from .serializers import PaymentSerializer, CreatePaymentSerializer
from .blockchain import record_payment_on_blockchain, verify_transaction, get_network_status


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

        # ── Record on Polygon blockchain ──────────────────────────────────
        blockchain_result = record_payment_on_blockchain(
            tx_id     = payment.tx_id,
            member_id = payment.member.member_id,
            loan_id   = payment.loan.loan_id,
            amount    = payment.amount,
        )

        # Update payment with blockchain data
        if blockchain_result.get('tx_hash'):
            payment.polygon_tx   = blockchain_result['tx_hash']
            payment.block_number = blockchain_result.get('block')
            payment.network      = blockchain_result.get('network', 'polygon')
            payment.save()

        log_activity(
            'payment',
            f'Payment recorded: ₱{payment.amount:,.2f} from {payment.member.fullname} '
            f'({payment.member.member_id}) — Loan: {payment.loan.loan_id} '
            f'— Network: {blockchain_result.get("network", "local")} '
            f'— by {request.user.name}',
            request.user
        )

        response_data = PaymentSerializer(payment).data
        response_data['blockchain'] = blockchain_result
        return Response(response_data, status=201)

    return Response(s.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_stats_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    return Response({
        'total_collected':    float(Payment.objects.aggregate(t=Sum('amount'))['t'] or 0),
        'transaction_count':  Payment.objects.count(),
        'on_blockchain':      Payment.objects.exclude(polygon_tx=None).count(),
        'local_only':         Payment.objects.filter(polygon_tx=None).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_payment_view(request, tx_hash):
    """Verify a payment transaction on Polygon blockchain."""
    result = verify_transaction(tx_hash)
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def blockchain_status_view(request):
    """Check Polygon network connection status."""
    return Response(get_network_status())
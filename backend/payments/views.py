from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from activity_log.utils import log_activity
from .models import Payment, LoanRelease
from .serializers import PaymentSerializer, CreatePaymentSerializer
from .blockchain import record_payment_on_blockchain, verify_transaction, get_network_status


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_list_view(request):
    if request.method == 'GET':
        # ── OPTIMIZATION: select_related para isang query lang ──
        # Dati: 905 payments × 2 queries each = 1,810 queries!
        # Ngayon: 1 query lang with JOIN
        payments = Payment.objects.select_related(
            'member',
            'member__pre_member',
            'loan',
        ).order_by('-id')  # secondary sort by id

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


# ══════════════════════════════════════════════════════════════════════════════
# BAGO: LOAN RELEASE blockchain record — para makuha ng member (My Loans →
# Loan Details) o ng admin ang buong deduction breakdown na na-record sa
# Polygon blockchain sa oras na na-release ang kanilang loan. Ang aktwal na
# pag-record (paggawa ng LoanRelease + pagtawag sa blockchain) ay nangyayari
# sa loans/views.py, sa "Confirm Release" (status → Active) na hakbang.
# ══════════════════════════════════════════════════════════════════════════════
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_release_detail_view(request, loan_pk):
    from loans.models import Loan
    try:
        loan = Loan.objects.select_related('member').get(pk=loan_pk)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)

    # ── Member: sarili lang nila ang makikita ────────────────────────────
    if request.user.role == 'member':
        if not loan.member.user_id or loan.member.user_id != request.user.id:
            return Response({'error': 'Unauthorized.'}, status=403)

    release = LoanRelease.objects.filter(loan=loan).first()
    if not release:
        # Hindi pa na-release ang loan na 'to (o F2F na luma na, bago pa
        # ito ma-add sa system) — walang record, hindi ito error.
        return Response(None)

    return Response({
        'tx_id':             release.tx_id,
        'loan_id':           loan.loan_id,
        'member_id':         loan.member.member_id,
        'principal':         float(release.principal),
        'interest':          float(release.interest),
        'service_fee':       float(release.service_fee),
        'filing_fee':        float(release.filing_fee),
        'insurance':         float(release.insurance),
        'savings_deposit':   float(release.savings_deposit),
        'share_capital_cbu': float(release.share_capital_cbu),
        'total_deductions':  float(release.total_deductions),
        'net_proceeds':      float(release.net_proceeds),
        'recorded_by':       release.recorded_by,
        'hash':              release.hash,
        'polygon_tx':        release.polygon_tx,
        'network':           release.network,
        'explorer_url':      release.explorer_url,
        'released_at':       release.released_at.strftime('%Y-%m-%d %H:%M'),
    })
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from activity_log.utils import log_activity
from .models import Payment, LoanRelease
from .serializers import PaymentSerializer, CreatePaymentSerializer
from .blockchain import (
    record_payment_on_blockchain, verify_transaction, get_network_status,
    verify_payment_integrity, generate_payment_hash,
    verify_loan_release_integrity, generate_loan_release_hash,
)


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
            balance   = payment.balance,
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
# BAGO: "Verify Integrity" — ginagamit sa Blockchain Audit Log report (Reports
# tab), pag-click ng admin sa isang payment row. Dalawang antas ng pag-check:
#
#   1) DB-only check (laging gumagana, kahit walang Polygon na naka-configure):
#      kinukuha ang CURRENT na laman ng payment sa database, ire-recompute ang
#      hash gamit ito, at ikinukumpara sa "hash" column na naka-store noong
#      unang nagawa ang record. Kapag hindi tugma → binago yung record sa DB
#      pagkatapos ma-create (hal. sa pamamagitan ng direktang SQL/DB edit).
#
#   2) On-chain check (gumagana LANG kung naka-configure ang Polygon):
#      ire-recompute ulit ang hash mula sa CURRENT na DB values, at ikukumpara
#      sa hash na naka-lock sa Polygon smart contract mismo — ito ang
#      "tunay" na tamper-proof na check, dahil hindi na mababago ang laman ng
#      blockchain kahit anong mangyari sa database.
# ══════════════════════════════════════════════════════════════════════════════
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_payment_integrity_view(request, tx_id):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    try:
        payment = Payment.objects.select_related('member', 'loan').get(tx_id=tx_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found.'}, status=404)

    # ── 1) DB-only check: current data vs. the hash saved at creation ──────
    # ── BAGO: kasama na rin ang "balance" sa recompute — dapat tugma sa
    # bagong "generate_payment_hash()" formula (tingnan ang blockchain.py). ──
    recomputed_hash = generate_payment_hash(
        payment.tx_id, payment.member.member_id, payment.loan.loan_id,
        payment.amount, payment.balance,
    )
    db_tampered = recomputed_hash != payment.hash

    # ── 2) On-chain check (may sariling fallback kapag walang Polygon) ─────
    chain_result = verify_payment_integrity(
        tx_id     = payment.tx_id,
        member_id = payment.member.member_id,
        loan_id   = payment.loan.loan_id,
        amount    = payment.amount,
    )

    # ── BAGO: field-level diff (kung available galing sa chain) — para
    # makita EXACTLY kung magkaiba ba talaga ang AMOUNT (DB vs on-chain),
    # sa halip na "Tampered" na lang nang walang detalye. Kaparehong pattern
    # ng "field_diff" sa Loan Release verify. ───────────────────────────────
    field_diff = None
    if chain_result.get('expected_amount') is not None and chain_result.get('blockchain_amount') is not None:
        db_amt    = chain_result['expected_amount']
        chain_amt = chain_result['blockchain_amount']
        field_diff = [
            {'field': 'amount', 'db_value': db_amt, 'chain_value': chain_amt, 'match': db_amt == chain_amt}
        ]

    return Response({
        'tx_id':              payment.tx_id,
        'member':             payment.member.fullname,
        'member_id':          payment.member.member_id,
        'loan_id':            payment.loan.loan_id,
        'amount':             float(payment.amount),
        'stored_hash':        payment.hash,
        'recomputed_hash':    recomputed_hash,
        'db_verified':        not db_tampered,
        'db_tampered':        db_tampered,
        'chain_checked':      chain_result.get('reason') != 'Blockchain not connected',
        'chain_verified':     chain_result.get('verified', False),
        'chain_tampered':     chain_result.get('tampered', False),
        'chain_reason':       chain_result.get('reason'),
        'field_diff':         field_diff,
        'network':            payment.network,
        'polygon_tx':         payment.polygon_tx,
        'explorer_url':       payment.explorer_url,
        # ── Overall verdict: "tampered" kung alinman sa dalawang check ang
        # nag-flag nito; "verified" kung DB-check ay pasado (yun ang laging
        # available), "chain-unchecked" kung walang Polygon na naka-configure. ──
        'overall':            'tampered' if (db_tampered or chain_result.get('tampered')) else 'verified',
    })


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


# ══════════════════════════════════════════════════════════════════════════════
# BAGO: "Verify Integrity" para sa LOAN RELEASE — parehong konsepto/pattern
# gaya ng "verify_payment_integrity_view" sa itaas, pero sumasaklaw sa BUONG
# deduction breakdown (principal, interest, service fee, filing fee, insurance,
# savings deposit, share capital CBU, net proceeds) sa halip na amount lang.
# Ginagamit sa "My Loans → Loan Details" (member) at sa admin Loan Approval/
# Loan Release view, pag-click ng "Verify" button doon.
# ══════════════════════════════════════════════════════════════════════════════
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_loan_release_integrity_view(request, tx_id):
    try:
        release = LoanRelease.objects.select_related('member', 'loan').get(tx_id=tx_id)
    except LoanRelease.DoesNotExist:
        return Response({'error': 'Loan release not found.'}, status=404)

    # ── Member: sarili lang nila ang makikita (kaparehong guard gaya ng
    # loan_release_detail_view sa itaas). Admin/staff: lahat pwede. ──────────
    if request.user.role == 'member':
        if not release.member.user_id or release.member.user_id != request.user.id:
            return Response({'error': 'Unauthorized.'}, status=403)
    elif request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    breakdown = {
        'principal':         str(release.principal),
        'interest':          str(release.interest),
        'service_fee':       str(release.service_fee),
        'filing_fee':        str(release.filing_fee),
        'insurance':         str(release.insurance),
        'savings_deposit':   str(release.savings_deposit),
        'share_capital_cbu': str(release.share_capital_cbu),
        'net_proceeds':      str(release.net_proceeds),
    }

    # ── 1) DB-only check: current breakdown vs. the hash saved at creation ──
    recomputed_hash = generate_loan_release_hash(
        release.tx_id, release.member.member_id, release.loan.loan_id, breakdown,
    )
    db_tampered = recomputed_hash != release.hash

    # ── 2) On-chain check (may sariling fallback kapag walang Polygon) ─────
    chain_result = verify_loan_release_integrity(
        tx_id     = release.tx_id,
        member_id = release.member.member_id,
        loan_id   = release.loan.loan_id,
        breakdown = breakdown,
    )

    # ── BAGO: per-field na diff (kung available) — para makita EXACTLY kung
    # aling field ang hindi tumutugma sa pagitan ng DB (ngayon) at ng
    # naka-lock na sa Polygon, sa halip na "Tampered" na lang nang walang
    # detalye. Ang pagkakasunod-sunod ay tugma sa LoanReleaseRecord struct
    # sa Solidity contract: principal, interest, service_fee, filing_fee,
    # insurance, savings_deposit, share_capital_cbu, net_proceeds. ──────────
    field_diff = None
    if chain_result.get('expected_values') and chain_result.get('blockchain_values'):
        field_names = ['principal', 'interest', 'service_fee', 'filing_fee',
                        'insurance', 'savings_deposit', 'share_capital_cbu', 'net_proceeds']
        expected  = chain_result['expected_values']
        on_chain  = chain_result['blockchain_values']
        field_diff = [
            {'field': name, 'db_value': expected[i], 'chain_value': on_chain[i], 'match': expected[i] == on_chain[i]}
            for i, name in enumerate(field_names)
        ]

    return Response({
        'tx_id':              release.tx_id,
        'member':             release.member.fullname,
        'member_id':          release.member.member_id,
        'loan_id':            release.loan.loan_id,
        'net_proceeds':       float(release.net_proceeds),
        'stored_hash':        release.hash,
        'recomputed_hash':    recomputed_hash,
        'db_verified':        not db_tampered,
        'db_tampered':        db_tampered,
        'chain_checked':      chain_result.get('reason') != 'Blockchain not connected',
        'chain_verified':     chain_result.get('verified', False),
        'chain_tampered':     chain_result.get('tampered', False),
        'chain_reason':       chain_result.get('reason'),
        'field_diff':         field_diff,
        'network':            release.network,
        'polygon_tx':         release.polygon_tx,
        'explorer_url':       release.explorer_url,
        'overall':            'tampered' if (db_tampered or chain_result.get('tampered')) else 'verified',
    })
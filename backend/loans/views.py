import datetime
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from dateutil.relativedelta import relativedelta

from activity_log.utils import log_activity
from .models import Loan
from .serializers import LoanSerializer, CreateLoanSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def loan_list_view(request):
    if request.method == 'GET':
        # ── OPTIMIZATION: select_related para isang query lang ──
        loans = Loan.objects.select_related(
            'member',
            'member__pre_member',
            'member__user',
        ).all()
        if request.user.role == 'member':
            loans = loans.filter(member__user=request.user)
        if s := request.query_params.get('status'):
            loans = loans.filter(status=s)
        if q := request.query_params.get('search', '').strip():
            loans = loans.filter(member__pre_member__last_name__icontains=q) | \
                    loans.filter(member__pre_member__first_name__icontains=q) | \
                    loans.filter(loan_id__icontains=q)
        return Response(LoanSerializer(loans, many=True).data)

    s = CreateLoanSerializer(data=request.data, context={'request': request})
    if s.is_valid():
        loan = s.save()
        log_activity(
            'loan',
            f'Loan application submitted: {loan.loan_id} — {loan.member.fullname} — ₱{loan.amount:,.2f} ({loan.loan_type})',
            request.user
        )
        return Response(LoanSerializer(loan).data, status=201)

    print(f"[LOAN CREATE ERROR] {s.errors}")
    return Response(s.errors, status=400)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def loan_detail_view(request, pk):
    try:
        # ── OPTIMIZATION: select_related para sa member data ──
        loan = Loan.objects.select_related(
            'member',
            'member__pre_member',
            'member__user',
        ).get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        return Response(LoanSerializer(loan).data)

    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    new_status = request.data.get('status')
    if new_status:
        if new_status == 'Approved':
            from decimal import Decimal
            from members.models import Savings
            from django.db.models import Sum

            loan.status        = 'Active'
            loan.approved_at   = timezone.now()
            loan.approved_by   = request.user.username
            loan.next_due_date = datetime.date.today() + relativedelta(months=1)

            # ── 1. Share Capital CBU (+3%) ─────────────────────────────────
            share_capital_addition = loan.amount * Decimal('0.03')
            loan.member.share_capital += share_capital_addition
            loan.member.save()

            # ── 2. Savings Deposit (1%) → auto-record in Savings ──────────
            savings_deposit = loan.amount * Decimal('0.01')

            # Compute current savings balance for balance_after
            total_dep = Savings.objects.filter(
                member=loan.member, transaction_type='Deposit'
            ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
            total_wdr = Savings.objects.filter(
                member=loan.member, transaction_type='Withdraw'
            ).aggregate(t=Sum('amount'))['t'] or Decimal('0')
            current_balance = total_dep - total_wdr
            new_balance     = current_balance + savings_deposit

            Savings.objects.create(
                member           = loan.member,
                transaction_type = 'Deposit',
                amount           = savings_deposit,
                balance_after    = new_balance,
                note             = f'Auto-deposit from loan {loan.loan_id} (1% savings deposit)',
                recorded_by      = request.user.username,
            )

            log_activity(
                'loan',
                f'Loan approved & activated: {loan.loan_id} — {loan.member.fullname} — ₱{loan.amount:,.2f} | '
                f'Share Capital +₱{share_capital_addition:,.2f} | '
                f'Savings Deposit +₱{savings_deposit:,.2f}',
                request.user
            )

        elif new_status == 'Declined':
            loan.status         = 'Declined'
            loan.decline_reason = request.data.get('decline_reason', '')
            log_activity(
                'loan',
                f'Loan declined: {loan.loan_id} — {loan.member.fullname}',
                request.user
            )
        else:
            loan.status = new_status

        if request.data.get('remarks'):
            loan.remarks = request.data.get('remarks')
        loan.save()

    return Response(LoanSerializer(loan).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def due_dates_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    loans = Loan.objects.filter(
        status__in=['Active', 'Overdue'],
        next_due_date__isnull=False
    ).select_related('member', 'member__pre_member')

    month_str = request.query_params.get('month', '')
    if month_str:
        try:
            year, month = map(int, month_str.split('-'))
            loans = loans.filter(
                next_due_date__year=year,
                next_due_date__month=month
            )
        except Exception:
            pass

    grouped = {}
    for loan in loans:
        key = loan.next_due_date.strftime('%Y-%m-%d')
        if key not in grouped:
            grouped[key] = []
        grouped[key].append({
            'loan_id':     loan.loan_id,
            'member_name': loan.member.fullname,
            'member_id':   loan.member.member_id,
            'loan_type':   loan.loan_type,
            'balance':     float(loan.balance),
            'monthly_due': float(loan.monthly_due),
            'status':      loan.status,
        })

    return Response(grouped)
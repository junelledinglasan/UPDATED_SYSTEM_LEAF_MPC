from django.db.models import Sum, Count, Avg, Q, F, FloatField
from django.db.models.functions import TruncMonth, TruncYear, Cast
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from members.models import Member, LeafMemberInfo, Savings
from loans.models import Loan
from payments.models import Payment


# ── Helper: parse year param — returns int or None (None = All years) ──
def get_year(request):
    y = request.query_params.get('year', str(timezone.now().year))
    if y == 'All':
        return None
    try:
        return int(y)
    except (ValueError, TypeError):
        return timezone.now().year


def filter_by_year(qs, field, year):
    if year is None:
        return qs
    return qs.filter(**{f'{field}__year': year})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)

    loans_qs    = filter_by_year(Loan.objects.filter(status__in=['Active', 'Completed']), 'applied_at', year)
    payments_qs = filter_by_year(Payment.objects, 'paid_at', year)
    savings_dep = filter_by_year(Savings.objects.filter(transaction_type='Deposit'),  'created_at', year)
    savings_wdr = filter_by_year(Savings.objects.filter(transaction_type='Withdraw'), 'created_at', year)

    total_releases = float(loans_qs.aggregate(t=Sum('amount'))['t'] or 0)
    total_paid     = float(payments_qs.aggregate(t=Sum('amount'))['t'] or 0)
    rate           = round((total_paid / total_releases) * 100, 1) if total_releases else 0
    deposits       = float(savings_dep.aggregate(t=Sum('amount'))['t'] or 0)
    withdrawals    = float(savings_wdr.aggregate(t=Sum('amount'))['t'] or 0)

    all_loans_qs = filter_by_year(Loan.objects, 'applied_at', year)

    # ── FIX: Total share capital across all members ──
    total_share_capital = float(Member.objects.aggregate(t=Sum('share_capital'))['t'] or 0)

    return Response({
        'total_members':         Member.objects.count(),
        'active_members':        Member.objects.filter(membership_status='Active').count(),
        'inactive_members':      Member.objects.filter(membership_status='Inactive').count(),
        'pending_applications':  LeafMemberInfo.objects.filter(application_status='Pending').count(),
        'approved_applications': LeafMemberInfo.objects.filter(application_status='Approved').count(),
        'total_loans':           all_loans_qs.count(),
        'active_loans':          all_loans_qs.filter(status='Active').count(),
        # ── Overdue: check ALL loans regardless of year (current status) ──
        'overdue_loans':         Loan.objects.filter(status='Overdue').count(),
        'pending_loans':         all_loans_qs.filter(status='For Review').count(),
        'total_releases':        total_releases,
        'avg_loan_amount':       float(all_loans_qs.aggregate(a=Avg('amount'))['a'] or 0),
        'total_collection':      total_paid,
        'collection_rate':       rate,
        'total_savings_balance': deposits - withdrawals,
        'total_share_capital':   total_share_capital,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_collection_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Payment.objects, 'paid_at', year)

    data = (
        qs.annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )
    return Response([
        {'month': d['month'].strftime('%b %Y'), 'total': float(d['total'])}
        for d in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_status_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Loan.objects, 'applied_at', year)
    data = qs.values('status').annotate(count=Count('id'))
    result = {d['status']: d['count'] for d in data}
    # ── Always include current overdue loans (may be from previous years) ──
    total_overdue = Loan.objects.filter(status='Overdue').count()
    if total_overdue > 0:
        result['Overdue'] = total_overdue
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_type_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Loan.objects, 'applied_at', year)
    data = qs.values('loan_type').annotate(count=Count('id'))
    return Response({d['loan_type']: d['count'] for d in data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_behavior_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year          = get_year(request)
    overdue_count = filter_by_year(Loan.objects.filter(status='Overdue'), 'applied_at', year).count()
    payments      = filter_by_year(Payment.objects, 'paid_at', year).select_related('loan').all()

    on_time = late = 0
    for p in payments:
        if p.loan.next_due_date:
            if p.paid_at.date() <= p.loan.next_due_date:
                on_time += 1
            else:
                late += 1
        else:
            on_time += 1

    total = on_time + late + overdue_count
    if total == 0:
        return Response({'On Time': 0, 'Late': 0, 'Overdue': 0})
    return Response({
        'On Time': round((on_time / total) * 100, 1),
        'Late':    round((late / total) * 100, 1),
        'Overdue': round((overdue_count / total) * 100, 1),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    payments = (
        filter_by_year(Payment.objects, 'paid_at', year)
        .select_related('member', 'loan')
        .order_by('-paid_at')[:50]
    )
    return Response([{
        'tx_id':       p.tx_id,
        'member':      p.member.fullname,
        'member_id':   p.member.member_id,
        'loan_id':     p.loan.loan_id,
        'amount':      float(p.amount),
        'balance':     float(p.balance),
        'hash':        p.hash,
        'paid_at':     p.paid_at.strftime('%Y-%m-%d %H:%M'),
        'recorded_by': p.recorded_by,
    } for p in payments])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classification_analytics_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year   = get_year(request)
    result = []

    for cls in ['Student', 'Senior', 'Employed']:
        members_in_cls = Member.objects.filter(pre_member__classification=cls)
        member_ids     = list(members_in_cls.values_list('id', flat=True))

        loans    = filter_by_year(Loan.objects.filter(member_id__in=member_ids), 'applied_at', year)
        payments = filter_by_year(Payment.objects.filter(member_id__in=member_ids), 'paid_at', year)

        on_time = late = 0
        for p in payments.select_related('loan'):
            if p.loan.next_due_date:
                if p.paid_at.date() <= p.loan.next_due_date:
                    on_time += 1
                else:
                    late += 1
            else:
                on_time += 1

        total_payments = on_time + late
        on_time_pct    = round((on_time / total_payments) * 100, 1) if total_payments else 0

        dep = float(filter_by_year(Savings.objects.filter(member_id__in=member_ids, transaction_type='Deposit'),  'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)
        wth = float(filter_by_year(Savings.objects.filter(member_id__in=member_ids, transaction_type='Withdraw'), 'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)

        result.append({
            'classification':   cls,
            'member_count':     members_in_cls.count(),
            'total_loans':      loans.count(),
            'active_loans':     loans.filter(status='Active').count(),
            'overdue_loans':    loans.filter(status='Overdue').count(),
            'total_collected':  float(payments.aggregate(t=Sum('amount'))['t'] or 0),
            'total_payments':   total_payments,
            'on_time_payments': on_time,
            'late_payments':    late,
            'on_time_rate':     on_time_pct,
            'avg_loan_amount':  float(loans.aggregate(a=Avg('amount'))['a'] or 0),
            'total_savings':    dep - wth,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_performance_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year  = get_year(request)
    limit = int(request.query_params.get('limit', 20))

    loans_qs = filter_by_year(Loan.objects, 'applied_at', year)
    members  = Member.objects.filter(id__in=loans_qs.values_list('member_id', flat=True)).distinct()
    result   = []

    for m in members:
        payments = filter_by_year(Payment.objects.filter(member=m), 'paid_at', year).select_related('loan')

        on_time = late = 0
        for p in payments:
            if p.loan.next_due_date:
                if p.paid_at.date() <= p.loan.next_due_date:
                    on_time += 1
                else:
                    late += 1
            else:
                on_time += 1

        total_payments = on_time + late
        on_time_pct    = round((on_time / total_payments) * 100, 1) if total_payments else 0
        total_loans    = loans_qs.filter(member=m).count()
        overdue        = loans_qs.filter(member=m, status='Overdue').count()
        total_paid     = float(payments.aggregate(t=Sum('amount'))['t'] or 0)
        score          = max(0, min(100, on_time_pct - (overdue * 10)))

        dep = float(filter_by_year(Savings.objects.filter(member=m, transaction_type='Deposit'),  'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)
        wth = float(filter_by_year(Savings.objects.filter(member=m, transaction_type='Withdraw'), 'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)

        if total_payments > 0:
            result.append({
                'member_id':       m.member_id,
                'name':            m.fullname,
                'classification':  m.pre_member.classification if hasattr(m, 'pre_member') and m.pre_member else '—',
                'total_loans':     total_loans,
                'total_payments':  total_payments,
                'on_time':         on_time,
                'late':            late,
                'overdue_loans':   overdue,
                'on_time_rate':    on_time_pct,
                'total_paid':      total_paid,
                'score':           score,
                'rating':          'Excellent' if score >= 90 else 'Good' if score >= 70 else 'Fair' if score >= 50 else 'Poor',
                'savings_balance': dep - wth,
            })

    result.sort(key=lambda x: x['score'], reverse=True)
    return Response(result[:limit])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_borrowers_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year  = get_year(request)
    limit = int(request.query_params.get('limit', 10))

    qs   = filter_by_year(Loan.objects, 'applied_at', year)
    data = (
        qs.values('member__member_id', 'member__id')
        .annotate(loan_count=Count('id'), total_amount=Sum('amount'), avg_amount=Avg('amount'))
        .order_by('-loan_count')[:limit]
    )

    result = []
    for d in data:
        try:
            member = Member.objects.get(id=d['member__id'])
            pm     = getattr(member, 'pre_member', None)
            dep    = float(filter_by_year(Savings.objects.filter(member=member, transaction_type='Deposit'),  'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)
            wth    = float(filter_by_year(Savings.objects.filter(member=member, transaction_type='Withdraw'), 'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)
            result.append({
                'member_id':       member.member_id,
                'name':            member.fullname,
                'classification':  pm.classification if pm else '—',
                'loan_count':      d['loan_count'],
                'total_amount':    float(d['total_amount'] or 0),
                'avg_amount':      float(d['avg_amount'] or 0),
                'share_capital':   float(member.share_capital or 0),
                'savings_balance': dep - wth,
            })
        except Member.DoesNotExist:
            pass

    return Response({'year': year or 'All', 'data': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_amount_distribution_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year   = get_year(request)
    ranges = [
        ('₱3,000 - ₱10,000',   3000,   10000),
        ('₱10,001 - ₱30,000',  10001,  30000),
        ('₱30,001 - ₱50,000',  30001,  50000),
        ('₱50,001 - ₱100,000', 50001, 100000),
        ('₱100,001+',         100001, 999999999),
    ]

    result = []
    for label, min_amt, max_amt in ranges:
        qs    = filter_by_year(Loan.objects.filter(amount__gte=min_amt, amount__lte=max_amt), 'applied_at', year)
        count = qs.count()
        total = float(qs.aggregate(t=Sum('amount'))['t'] or 0)
        result.append({'range': label, 'count': count, 'total': total})

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def yearly_comparison_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    current_year = timezone.now().year
    years = [current_year - 3, current_year - 2, current_year - 1, current_year]

    result = []
    for year in years:
        collections = float(Payment.objects.filter(paid_at__year=year).aggregate(t=Sum('amount'))['t'] or 0)
        loan_count  = Loan.objects.filter(applied_at__year=year).count()
        loan_amount = float(Loan.objects.filter(applied_at__year=year).aggregate(t=Sum('amount'))['t'] or 0)
        new_members = Member.objects.filter(membership_date__year=year).count()
        savings_dep = float(Savings.objects.filter(transaction_type='Deposit', created_at__year=year).aggregate(t=Sum('amount'))['t'] or 0)

        result.append({
            'year':        year,
            'collections': collections,
            'loan_count':  loan_count,
            'loan_amount': loan_amount,
            'new_members': new_members,
            'savings_dep': savings_dep,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def share_capital_growth_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)

    loans_qs          = filter_by_year(Loan.objects.filter(status__in=['Active', 'Completed']), 'applied_at', year)
    member_ids_with_loans = loans_qs.values_list('member_id', flat=True).distinct()

    members = Member.objects.filter(
        id__in=member_ids_with_loans,
        share_capital__gt=0
    ).order_by('-share_capital')[:20]

    result = []
    for m in members:
        loan_count  = loans_qs.filter(member=m).count()
        total_loans = float(loans_qs.filter(member=m).aggregate(t=Sum('amount'))['t'] or 0)
        pm          = getattr(m, 'pre_member', None)
        dep         = float(filter_by_year(Savings.objects.filter(member=m, transaction_type='Deposit'),  'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)
        wth         = float(filter_by_year(Savings.objects.filter(member=m, transaction_type='Withdraw'), 'created_at', year).aggregate(t=Sum('amount'))['t'] or 0)

        result.append({
            'member_id':       m.member_id,
            'name':            m.fullname,
            'classification':  pm.classification if pm else '—',
            'share_capital':   float(m.share_capital),
            'max_loanable':    float(m.share_capital) * 2,
            'loan_count':      loan_count,
            'total_loaned':    total_loans,
            'savings_balance': dep - wth,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overdue_analysis_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year          = get_year(request)
    overdue_loans = filter_by_year(Loan.objects.filter(status='Overdue'), 'applied_at', year).select_related('member')
    by_classification = {}

    for loan in overdue_loans:
        pm  = getattr(loan.member, 'pre_member', None)
        cls = pm.classification if pm else 'Unknown'
        if cls not in by_classification:
            by_classification[cls] = {'count': 0, 'total_overdue': 0}
        by_classification[cls]['count']        += 1
        by_classification[cls]['total_overdue'] += float(loan.balance)

    result = [
        {'classification': cls, 'overdue_count': v['count'], 'total_overdue': v['total_overdue']}
        for cls, v in by_classification.items()
    ]
    result.sort(key=lambda x: x['overdue_count'], reverse=True)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_loans_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Loan.objects, 'applied_at', year)
    data = (
        qs.annotate(month=TruncMonth('applied_at'))
        .values('month')
        .annotate(count=Count('id'), total=Sum('amount'))
        .order_by('month')
    )
    return Response([
        {'month': d['month'].strftime('%b %Y' if year is None else '%b'), 'count': d['count'], 'total': float(d['total'] or 0)}
        for d in data
    ])


# ══════════════════════════════════════════════════════════════════
# REPORT DATA BUILDERS
# ══════════════════════════════════════════════════════════════════

def _parse_date(d):
    from datetime import datetime
    try:
        return datetime.strptime(d, '%Y-%m-%d').date()
    except Exception:
        return None


def build_report_data(report_type, date_from_str, date_to_str):
    from datetime import date
    df = _parse_date(date_from_str) or date(2000, 1, 1)
    dt = _parse_date(date_to_str)   or date.today()

    if report_type == 'Financial Summary':
        payments = Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).select_related('member', 'loan')
        total    = float(payments.aggregate(t=Sum('amount'))['t'] or 0)
        count    = payments.count()
        loans    = Loan.objects.filter(applied_at__date__gte=df, applied_at__date__lte=dt)
        released = float(loans.filter(status__in=['Active', 'Completed']).aggregate(t=Sum('amount'))['t'] or 0)
        rows = []
        for p in payments.select_related('member', 'loan').order_by('-paid_at'):
            rows.append([
                p.paid_at.strftime('%Y-%m-%d'), p.tx_id,
                p.member.fullname, p.member.member_id, p.loan.loan_id,
                f'₱{float(p.amount):,.2f}', f'₱{float(p.balance):,.2f}', p.recorded_by,
            ])
        return {
            'summary': [
                ('Total Collected',      f'₱{total:,.2f}'),
                ('Total Transactions',   count),
                ('Total Loan Releases',  f'₱{released:,.2f}'),
                ('Period',               f'{date_from_str} to {date_to_str}'),
            ],
            'columns':        ['Date', 'TX ID', 'Member Name', 'Member ID', 'Loan ID', 'Amount', 'Balance After', 'Recorded By'],
            'rows':           rows,
            'col_widths':     [14, 20, 20, 14, 16, 14, 15, 15],
            'col_widths_pdf': [2.2, 2.8, 3.5, 2.2, 2.5, 2.2, 2.5, 2.2],
        }

    elif report_type == 'Collection Report':
        monthly = (
            Payment.objects
            .filter(paid_at__date__gte=df, paid_at__date__lte=dt)
            .annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        total_all = float(Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).aggregate(t=Sum('amount'))['t'] or 0)
        rows = [[m['month'].strftime('%B %Y'), m['count'], f'₱{float(m["total"]):,.2f}'] for m in monthly]
        return {
            'summary':        [('Total Collected', f'₱{total_all:,.2f}'), ('Months with Data', len(rows))],
            'columns':        ['Month', 'No. of Transactions', 'Total Collected'],
            'rows':           rows,
            'col_widths':     [20, 22, 22],
            'col_widths_pdf': [6, 6, 6],
        }

    elif report_type == 'Loan Summary':
        loans = Loan.objects.filter(applied_at__date__gte=df, applied_at__date__lte=dt).select_related('member')
        rows  = []
        for l in loans.order_by('-applied_at'):
            rows.append([
                l.loan_id, l.member.fullname, l.member.member_id,
                l.loan_type, f'₱{float(l.amount):,.2f}',
                f'₱{float(l.balance):,.2f}', f'₱{float(l.monthly_due):,.2f}',
                l.term_months, l.status, l.applied_at.strftime('%Y-%m-%d'),
            ])
        total_amt = float(loans.aggregate(t=Sum('amount'))['t'] or 0)
        return {
            'summary': [
                ('Total Loans',           loans.count()),
                ('Total Amount Released', f'₱{total_amt:,.2f}'),
                ('Active Loans',          loans.filter(status='Active').count()),
                ('Overdue Loans',         loans.filter(status='Overdue').count()),
            ],
            'columns':        ['Loan ID', 'Member Name', 'Member ID', 'Type', 'Amount', 'Balance', 'Monthly Due', 'Term', 'Status', 'Date Applied'],
            'rows':           rows,
            'col_widths':     [16, 20, 14, 16, 14, 14, 13, 7, 12, 14],
            'col_widths_pdf': [2.2, 3.5, 2.2, 2.5, 2.2, 2.2, 2.2, 1.5, 2, 2.5],
        }

    elif report_type == 'Member Report':
        # ── Show ALL members regardless of date range for complete report ──
        members = Member.objects.all()
        rows    = []
        for m in members.order_by('member_id'):
            pm = getattr(m, 'pre_member', None)
            rows.append([
                m.member_id, m.last_name, m.first_name,
                pm.classification if pm else '—',
                pm.contact_number if pm else '—',
                m.membership_status, m.membership_date.strftime('%Y-%m-%d'),
            ])
        return {
            'summary': [
                ('Total Members', members.count()),
                ('Active',        members.filter(membership_status='Active').count()),
                ('Inactive',      members.filter(membership_status='Inactive').count()),
                ('Students',      members.filter(pre_member__classification='Student').count()),
                ('Seniors',       members.filter(pre_member__classification='Senior').count()),
                ('Employed',      members.filter(pre_member__classification='Employed').count()),
            ],
            'columns':        ['Member ID', 'Last Name', 'First Name', 'Classification', 'Contact', 'Status', 'Date Registered'],
            'rows':           rows,
            'col_widths':     [14, 16, 16, 16, 14, 12, 16],
            'col_widths_pdf': [2.2, 2.8, 2.8, 2.8, 2.5, 1.8, 2.5],
        }

    elif report_type == 'Payment Behavior':
        payments      = Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).select_related('loan', 'member')
        overdue_count = Loan.objects.filter(status='Overdue', applied_at__date__gte=df, applied_at__date__lte=dt).count()
        on_time = late = 0
        rows = []
        for p in payments.order_by('-paid_at'):
            status = 'On Time'
            if p.loan.next_due_date:
                status = 'On Time' if p.paid_at.date() <= p.loan.next_due_date else 'Late'
                if status == 'Late': late += 1
                else: on_time += 1
            else:
                on_time += 1
            rows.append([
                p.paid_at.strftime('%Y-%m-%d'), p.member.fullname,
                p.member.member_id, p.loan.loan_id,
                p.loan.next_due_date.strftime('%Y-%m-%d') if p.loan.next_due_date else '—',
                f'₱{float(p.amount):,.2f}', status,
            ])
        total = on_time + late + overdue_count
        return {
            'summary': [
                ('On Time Payments', f'{on_time} ({round(on_time/total*100,1) if total else 0}%)'),
                ('Late Payments',    f'{late} ({round(late/total*100,1) if total else 0}%)'),
                ('Overdue Loans',    f'{overdue_count} ({round(overdue_count/total*100,1) if total else 0}%)'),
            ],
            'columns':        ['Payment Date', 'Member Name', 'Member ID', 'Loan ID', 'Due Date', 'Amount Paid', 'Status'],
            'rows':           rows,
            'col_widths':     [14, 22, 14, 16, 14, 15, 12],
            'col_widths_pdf': [2.5, 4, 2.5, 2.5, 2.5, 2.5, 2],
        }

    elif report_type == 'Blockchain Audit Log':
        payments = Payment.objects.filter(
            paid_at__date__gte=df, paid_at__date__lte=dt
        ).select_related('member', 'loan').order_by('-paid_at')
        rows = []
        for p in payments:
            rows.append([
                p.paid_at.strftime('%Y-%m-%d %H:%M'), p.tx_id,
                p.member.fullname, p.member.member_id, p.loan.loan_id,
                f'₱{float(p.amount):,.2f}', f'₱{float(p.balance):,.2f}',
                p.hash, p.recorded_by,
            ])
        return {
            'summary':        [('Total Transactions', payments.count())],
            'columns':        ['Date & Time', 'TX ID', 'Member', 'Member ID', 'Loan ID', 'Amount', 'Balance', 'Hash', 'By'],
            'rows':           rows,
            'col_widths':     [16, 20, 20, 14, 14, 13, 14, 30, 14],
            'col_widths_pdf': [2.5, 3, 3.5, 2.2, 2.2, 2, 2, 4.5, 2],
        }

    elif report_type == 'Member Performance Report':
        members = Member.objects.filter(loans__isnull=False).distinct().select_related('pre_member')
        rows = []
        for m in members:
            payments = Payment.objects.filter(
                member=m, paid_at__date__gte=df, paid_at__date__lte=dt
            ).select_related('loan')
            on_time = late = 0
            for p in payments:
                if p.loan.next_due_date:
                    if p.paid_at.date() <= p.loan.next_due_date:
                        on_time += 1
                    else:
                        late += 1
                else:
                    on_time += 1
            total_p = on_time + late
            rate    = round((on_time / total_p) * 100, 1) if total_p else 0
            overdue = Loan.objects.filter(member=m, status='Overdue', applied_at__date__gte=df, applied_at__date__lte=dt).count()
            score   = max(0, min(100, rate - (overdue * 10)))
            rating  = 'Excellent' if score >= 90 else 'Good' if score >= 70 else 'Fair' if score >= 50 else 'Poor'
            pm      = getattr(m, 'pre_member', None)
            if total_p > 0:
                rows.append([
                    m.member_id, m.fullname,
                    pm.classification if pm else '—',
                    total_p, on_time, late, overdue,
                    f'{rate}%', rating,
                ])
        rows.sort(key=lambda r: r[7], reverse=True)
        return {
            'summary': [
                ('Total Members with Loans', len(rows)),
                ('Excellent Performers',     sum(1 for r in rows if r[8] == 'Excellent')),
                ('Good Performers',          sum(1 for r in rows if r[8] == 'Good')),
                ('Needs Improvement',        sum(1 for r in rows if r[8] in ['Fair', 'Poor'])),
            ],
            'columns':        ['Member ID', 'Name', 'Classification', 'Payments', 'On Time', 'Late', 'Overdue Loans', 'On-Time Rate', 'Rating'],
            'rows':           rows,
            'col_widths':     [14, 22, 16, 11, 10, 8, 15, 13, 12],
            'col_widths_pdf': [2.2, 3.5, 2.5, 1.8, 1.8, 1.5, 2.5, 2, 1.8],
        }

    elif report_type == 'Classification Analytics':
        classifications = ['Student', 'Senior', 'Employed']
        rows = []
        for cls in classifications:
            members_in_cls = Member.objects.filter(pre_member__classification=cls)
            member_ids     = list(members_in_cls.values_list('id', flat=True))
            payments = Payment.objects.filter(
                member_id__in=member_ids,
                paid_at__date__gte=df, paid_at__date__lte=dt
            ).select_related('loan')
            on_time = late = 0
            for p in payments:
                if p.loan.next_due_date:
                    if p.paid_at.date() <= p.loan.next_due_date:
                        on_time += 1
                    else:
                        late += 1
                else:
                    on_time += 1
            total_p         = on_time + late
            rate            = round((on_time / total_p) * 100, 1) if total_p else 0
            total_collected = float(payments.aggregate(t=Sum('amount'))['t'] or 0)
            loan_count      = Loan.objects.filter(
                member_id__in=member_ids,
                applied_at__date__gte=df, applied_at__date__lte=dt
            ).count()
            rows.append([cls, members_in_cls.count(), loan_count, total_p, on_time, late, f'{rate}%', f'₱{total_collected:,.2f}'])
        return {
            'summary':        [('Period', f'{date_from_str} to {date_to_str}')],
            'columns':        ['Classification', 'Members', 'Loans', 'Payments', 'On Time', 'Late', 'On-Time Rate', 'Total Collected'],
            'rows':           rows,
            'col_widths':     [16, 10, 8, 11, 10, 8, 14, 18],
            'col_widths_pdf': [2.8, 2, 1.8, 2, 1.8, 1.5, 2.5, 3],
        }

    elif report_type == 'Savings Report':
        savings = Savings.objects.filter(
            created_at__date__gte=df, created_at__date__lte=dt
        ).select_related('member').order_by('-created_at')

        total_deposits    = float(savings.filter(transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
        total_withdrawals = float(savings.filter(transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)
        net_savings       = total_deposits - total_withdrawals

        rows = []
        for s in savings:
            rows.append([
                s.created_at.strftime('%Y-%m-%d'),
                s.member.member_id,
                s.member.fullname,
                s.transaction_type,
                f'₱{float(s.amount):,.2f}',
                f'₱{float(s.balance_after):,.2f}',
                s.note or '—',
                s.recorded_by or '—',
            ])
        return {
            'summary': [
                ('Total Deposits',     f'₱{total_deposits:,.2f}'),
                ('Total Withdrawals',  f'₱{total_withdrawals:,.2f}'),
                ('Net Savings',        f'₱{net_savings:,.2f}'),
                ('Total Transactions', savings.count()),
                ('Period',             f'{date_from_str} to {date_to_str}'),
            ],
            'columns':        ['Date', 'Member ID', 'Member Name', 'Type', 'Amount', 'Balance After', 'Note', 'Recorded By'],
            'rows':           rows,
            'col_widths':     [14, 14, 22, 12, 14, 15, 20, 14],
            'col_widths_pdf': [2, 2, 3.5, 1.8, 2, 2.2, 3, 2],
        }

    return {'columns': [], 'rows': [], 'summary': []}


# ══════════════════════════════════════════════════════════════════
# EXPORT ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_excel_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    report_type = request.query_params.get('type', '')
    date_from   = request.query_params.get('from', '2026-01-01')
    date_to     = request.query_params.get('to',   '2026-12-31')
    if not report_type:
        return Response({'error': 'Report type required.'}, status=400)
    from .exporters import generate_excel
    data     = build_report_data(report_type, date_from, date_to)
    buf      = generate_excel(report_type, date_from, date_to, data)
    filename = f"LEAF_MPC_{report_type.replace(' ', '_')}_{date_from}_to_{date_to}.xlsx"
    response = HttpResponse(buf.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    report_type = request.query_params.get('type', '')
    date_from   = request.query_params.get('from', '2026-01-01')
    date_to     = request.query_params.get('to',   '2026-12-31')
    if not report_type:
        return Response({'error': 'Report type required.'}, status=400)
    from .exporters import generate_pdf
    data     = build_report_data(report_type, date_from, date_to)
    buf      = generate_pdf(report_type, date_from, date_to, data)
    filename = f"LEAF_MPC_{report_type.replace(' ', '_')}_{date_from}_to_{date_to}.pdf"
    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── Simple preview cache (per-process, resets on server restart) ──
_preview_cache = {}

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_report_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    report_type = request.query_params.get('type', '')
    date_from   = request.query_params.get('from', '2026-01-01')
    date_to     = request.query_params.get('to',   '2026-12-31')
    if not report_type:
        return Response({'error': 'Report type required.'}, status=400)

    # ── Cache key ──
    cache_key = f"{report_type}|{date_from}|{date_to}"
    if cache_key in _preview_cache:
        return Response(_preview_cache[cache_key])

    data = build_report_data(report_type, date_from, date_to)
    rows = data.get('rows', [])
    result = {
        'report_type': report_type,
        'date_from':   date_from,
        'date_to':     date_to,
        'summary':     data.get('summary', []),
        'columns':     data.get('columns', []),
        'rows':        rows[:25],
        'total_rows':  len(rows),
    }
    # Cache result (max 50 entries)
    if len(_preview_cache) < 50:
        _preview_cache[cache_key] = result
    return Response(result)



# ══════════════════════════════════════════════════════════════════
# NEW ANALYTICS ENDPOINTS — ADDITIONAL
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_repayment_progress_view(request):
    """Per-member repayment progress — amount paid vs remaining."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year  = get_year(request)
    loans = filter_by_year(
        Loan.objects.filter(status__in=['Active','Overdue']).select_related('member'),
        'applied_at', year
    )

    result = []
    for l in loans:
        principal  = float(l.amount or 0)
        balance    = float(l.balance or 0)
        paid       = principal - balance
        pct        = round((paid / principal) * 100, 1) if principal > 0 else 0
        result.append({
            'loan_id':     l.loan_id,
            'member_id':   l.member.member_id,
            'member_name': l.member.fullname,
            'loan_type':   l.loan_type,
            'principal':   principal,
            'paid':        paid,
            'balance':     balance,
            'pct_paid':    pct,
            'monthly_due': float(l.monthly_due or 0),
            'status':      l.status,
            'applied_at':  str(l.applied_at)[:10],
        })

    result.sort(key=lambda x: x['pct_paid'], reverse=True)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delinquency_report_view(request):
    """Members who haven't paid in X months."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    from datetime import date, timedelta
    from django.db.models import Max

    today        = date.today()
    months_param = int(request.query_params.get('months', 1))
    cutoff       = today - timedelta(days=30 * months_param)

    overdue_loans = Loan.objects.filter(
        status__in=['Active','Overdue']
    ).select_related('member').annotate(
        last_payment=Max('payments__paid_at')
    )

    result = []
    for l in overdue_loans:
        last_pay = l.last_payment
        if last_pay:
            last_pay_date = last_pay.date() if hasattr(last_pay, 'date') else last_pay
            if last_pay_date > cutoff:
                continue
            days_since = (today - last_pay_date).days
        else:
            days_since = (today - l.applied_at.date()).days

        result.append({
            'loan_id':      l.loan_id,
            'member_id':    l.member.member_id,
            'member_name':  l.member.fullname,
            'loan_type':    l.loan_type,
            'balance':      float(l.balance or 0),
            'monthly_due':  float(l.monthly_due or 0),
            'last_payment': str(last_pay)[:10] if last_pay else 'No payment yet',
            'days_since':   days_since,
            'status':       l.status,
        })

    result.sort(key=lambda x: x['days_since'], reverse=True)
    return Response({'months': months_param, 'count': len(result), 'data': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def collection_efficiency_view(request):
    """Actual collected vs expected collection per month."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)

    # Expected = sum of monthly_due of all active loans
    active_loans = Loan.objects.filter(status__in=['Active','Overdue'])
    expected_monthly = float(active_loans.aggregate(t=Sum('monthly_due'))['t'] or 0)

    # Actual = payments collected per month
    payments_qs = filter_by_year(Payment.objects, 'paid_at', year)
    monthly_data = (
        payments_qs
        .annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(collected=Sum('amount'), count=Count('id'))
        .order_by('month')
    )

    result = []
    for m in monthly_data:
        collected   = float(m['collected'] or 0)
        efficiency  = round((collected / expected_monthly) * 100, 1) if expected_monthly > 0 else 0
        result.append({
            'month':           m['month'].strftime('%b %Y'),
            'collected':       collected,
            'expected':        expected_monthly,
            'efficiency_pct':  efficiency,
            'tx_count':        m['count'],
        })

    return Response({
        'expected_monthly': expected_monthly,
        'active_loans':     active_loans.count(),
        'data':             result,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_growth_view(request):
    """Monthly member registrations over time."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Member.objects, 'membership_date', year)

    monthly = (
        qs.annotate(month=TruncMonth('membership_date'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )

    # Cumulative total
    cumulative = 0
    result     = []
    for m in monthly:
        cumulative += m['count']
        result.append({
            'month':      m['month'].strftime('%b %Y'),
            'new':        m['count'],
            'cumulative': cumulative,
        })

    return Response({
        'total_members': Member.objects.count(),
        'data': result,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_approval_rate_view(request):
    """Loan approval rate — approved vs declined."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Loan.objects, 'applied_at', year)

    total    = qs.count()
    approved = qs.filter(status__in=['Active','Completed','Overdue']).count()
    declined = qs.filter(status='Declined').count()
    pending  = qs.filter(status='For Review').count()
    rate     = round((approved / total) * 100, 1) if total else 0

    # By loan type
    by_type = []
    for lt in ['Regular Loan','Emergency Loan','Salary Loan','Housing Loan','Business Loan']:
        lt_qs    = qs.filter(loan_type=lt)
        lt_total = lt_qs.count()
        if lt_total == 0:
            continue
        lt_approved = lt_qs.filter(status__in=['Active','Completed','Overdue']).count()
        lt_declined = lt_qs.filter(status='Declined').count()
        by_type.append({
            'loan_type': lt,
            'total':     lt_total,
            'approved':  lt_approved,
            'declined':  lt_declined,
            'rate':      round((lt_approved / lt_total) * 100, 1) if lt_total else 0,
        })

    # Monthly trend
    monthly = (
        qs.annotate(month=TruncMonth('applied_at'))
        .values('month')
        .annotate(total=Count('id'))
        .order_by('month')
    )
    monthly_data = []
    for m in monthly:
        m_qs  = qs.filter(applied_at__month=m['month'].month, applied_at__year=m['month'].year)
        m_app = m_qs.filter(status__in=['Active','Completed','Overdue']).count()
        m_dec = m_qs.filter(status='Declined').count()
        monthly_data.append({
            'month':    m['month'].strftime('%b %Y'),
            'total':    m['total'],
            'approved': m_app,
            'declined': m_dec,
        })

    return Response({
        'total':        total,
        'approved':     approved,
        'declined':     declined,
        'pending':      pending,
        'approval_rate':rate,
        'by_type':      by_type,
        'monthly':      monthly_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def upcoming_maturities_view(request):
    """Loans maturing within the next N months."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta

    months = int(request.query_params.get('months', 3))
    today  = date.today()
    future = today + relativedelta(months=months)

    loans = Loan.objects.filter(
        status__in=['Active','Overdue']
    ).select_related('member')

    result = []
    for l in loans:
        if not l.approved_at:
            continue
        try:
            from dateutil.relativedelta import relativedelta as rd
            maturity = l.approved_at.date() + rd(months=int(l.term_months or 0))
        except Exception:
            continue

        if today <= maturity <= future:
            result.append({
                'loan_id':     l.loan_id,
                'member_id':   l.member.member_id,
                'member_name': l.member.fullname,
                'loan_type':   l.loan_type,
                'amount':      float(l.amount or 0),
                'balance':     float(l.balance or 0),
                'monthly_due': float(l.monthly_due or 0),
                'maturity':    str(maturity),
                'days_left':   (maturity - today).days,
                'status':      l.status,
            })

    result.sort(key=lambda x: x['days_left'])
    return Response({'months': months, 'count': len(result), 'data': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def first_time_borrowers_view(request):
    """Members applying for their first loan."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = get_year(request)
    qs   = filter_by_year(Loan.objects, 'applied_at', year)

    # Members who have exactly 1 loan total
    from django.db.models import Count as C
    first_timers = (
        qs.values('member_id')
        .annotate(loan_count=C('id'))
        .filter(loan_count=1)
    )
    member_ids = [ft['member_id'] for ft in first_timers]

    result = []
    for mid in member_ids:
        try:
            loan   = qs.filter(member_id=mid).first()
            member = loan.member
            result.append({
                'member_id':   member.member_id,
                'member_name': member.fullname,
                'loan_id':     loan.loan_id,
                'loan_type':   loan.loan_type,
                'amount':      float(loan.amount or 0),
                'status':      loan.status,
                'applied_at':  str(loan.applied_at)[:10],
                'classification': member.pre_member.classification if member.pre_member else '—',
            })
        except Exception:
            pass

    result.sort(key=lambda x: x['applied_at'], reverse=True)
    return Response({'count': len(result), 'data': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_assessment_view(request):
    """Members at risk — high balance, overdue, or no recent payment."""
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    from datetime import date, timedelta
    from django.db.models import Max

    today  = date.today()
    cutoff = today - timedelta(days=60)  # 60 days no payment = at risk

    loans = Loan.objects.filter(
        status__in=['Active','Overdue']
    ).select_related('member').annotate(
        last_payment=Max('payments__paid_at')
    )

    result = []
    for l in loans:
        risk_score  = 0
        risk_flags  = []

        # Flag 1: Overdue
        if l.status == 'Overdue':
            risk_score += 40
            risk_flags.append('Overdue')

        # Flag 2: No payment in 60+ days
        last_pay = l.last_payment
        if last_pay:
            last_date = last_pay.date() if hasattr(last_pay, 'date') else last_pay
            days_since = (today - last_date).days
            if days_since > 60:
                risk_score += 30
                risk_flags.append(f'No payment {days_since}d')
        else:
            days_since = (today - l.applied_at.date()).days
            risk_score += 20
            risk_flags.append('No payment yet')

        # Flag 3: Balance > 80% of original
        principal = float(l.amount or 0)
        balance   = float(l.balance or 0)
        pct_remaining = (balance / principal * 100) if principal > 0 else 0
        if pct_remaining > 80:
            risk_score += 20
            risk_flags.append(f'{pct_remaining:.0f}% unpaid')

        # Flag 4: Balance > 50,000
        if balance > 50000:
            risk_score += 10
            risk_flags.append('High balance')

        if risk_score >= 20:
            risk_level = 'Critical' if risk_score >= 70 else 'High' if risk_score >= 50 else 'Medium'
            result.append({
                'loan_id':      l.loan_id,
                'member_id':    l.member.member_id,
                'member_name':  l.member.fullname,
                'loan_type':    l.loan_type,
                'balance':      balance,
                'monthly_due':  float(l.monthly_due or 0),
                'pct_remaining':round(pct_remaining, 1),
                'last_payment': str(last_pay)[:10] if last_pay else 'None',
                'days_since':   days_since,
                'risk_score':   risk_score,
                'risk_level':   risk_level,
                'risk_flags':   risk_flags,
                'status':       l.status,
            })

    result.sort(key=lambda x: x['risk_score'], reverse=True)
    summary = {
        'critical': sum(1 for r in result if r['risk_level']=='Critical'),
        'high':     sum(1 for r in result if r['risk_level']=='High'),
        'medium':   sum(1 for r in result if r['risk_level']=='Medium'),
    }
    return Response({'summary': summary, 'count': len(result), 'data': result})
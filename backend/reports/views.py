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


# ══════════════════════════════════════════════════════════════════
# EXISTING ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    # ── ADDED: year filter ────────────────────────────────────────
    year = int(request.query_params.get('year', timezone.now().year))

    total_releases = float(
        Loan.objects.filter(status__in=['Active', 'Completed'], applied_at__year=year)
        .aggregate(t=Sum('amount'))['t'] or 0
    )
    total_paid = float(
        Payment.objects.filter(paid_at__year=year)
        .aggregate(t=Sum('amount'))['t'] or 0
    )
    rate = round((total_paid / total_releases) * 100, 1) if total_releases else 0

    # ── ADDED: savings balance (net of all deposits minus withdrawals) ─
    deposits   = float(Savings.objects.filter(transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
    withdrawals= float(Savings.objects.filter(transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)
    total_savings_balance = deposits - withdrawals

    return Response({
        'total_members':           Member.objects.count(),
        'active_members':          Member.objects.filter(membership_status='Active').count(),
        'inactive_members':        Member.objects.filter(membership_status='Inactive').count(),
        'pending_applications':    LeafMemberInfo.objects.filter(application_status='Pending').count(),
        'approved_applications':   LeafMemberInfo.objects.filter(application_status='Approved').count(),
        'total_loans':             Loan.objects.filter(applied_at__year=year).count(),
        'active_loans':            Loan.objects.filter(status='Active').count(),
        'overdue_loans':           Loan.objects.filter(status='Overdue').count(),
        'pending_loans':           Loan.objects.filter(status='For Review').count(),
        'total_releases':          total_releases,
        'avg_loan_amount':         float(Loan.objects.filter(applied_at__year=year).aggregate(a=Avg('amount'))['a'] or 0),
        'total_collection':        total_paid,
        'collection_rate':         rate,
        # ── NEW ──
        'total_savings_balance':   total_savings_balance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_collection_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    # ── ADDED: year filter ────────────────────────────────────────
    year = int(request.query_params.get('year', timezone.now().year))

    data = (
        Payment.objects
        .filter(paid_at__year=year)          # <── filter by year
        .annotate(month=TruncMonth('paid_at'))
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

    # ── ADDED: year filter ────────────────────────────────────────
    year = int(request.query_params.get('year', timezone.now().year))

    data = Loan.objects.filter(applied_at__year=year).values('status').annotate(count=Count('id'))
    return Response({d['status']: d['count'] for d in data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_type_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    # ── ADDED: year filter ────────────────────────────────────────
    year = int(request.query_params.get('year', timezone.now().year))

    data = Loan.objects.filter(applied_at__year=year).values('loan_type').annotate(count=Count('id'))
    return Response({d['loan_type']: d['count'] for d in data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_behavior_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    # ── ADDED: year filter ────────────────────────────────────────
    year = int(request.query_params.get('year', timezone.now().year))

    overdue_count = Loan.objects.filter(status='Overdue').count()
    payments = Payment.objects.filter(paid_at__year=year).select_related('loan').all()
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
    payments = Payment.objects.select_related('member', 'loan').order_by('-paid_at')[:50]
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


# ══════════════════════════════════════════════════════════════════
# NEW ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classification_analytics_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year = int(request.query_params.get('year', timezone.now().year))

    result = []
    classifications = ['Student', 'Senior', 'Employed']

    for cls in classifications:
        members_in_cls = Member.objects.filter(pre_member__classification=cls)
        member_ids = list(members_in_cls.values_list('id', flat=True))

        loans    = Loan.objects.filter(member_id__in=member_ids)
        payments = Payment.objects.filter(member_id__in=member_ids, paid_at__year=year)

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
        on_time_pct = round((on_time / total_payments) * 100, 1) if total_payments else 0

        # ── ADDED: savings per classification ────────────────────
        dep = float(Savings.objects.filter(member_id__in=member_ids, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
        wth = float(Savings.objects.filter(member_id__in=member_ids, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)
        total_savings = dep - wth

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
            'total_savings':    total_savings,   # ← NEW
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def member_performance_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year  = int(request.query_params.get('year', timezone.now().year))
    limit = int(request.query_params.get('limit', 20))

    members = Member.objects.filter(loans__isnull=False).distinct()
    result  = []

    for m in members:
        payments = Payment.objects.filter(
            member=m, paid_at__year=year
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

        total_payments = on_time + late
        on_time_pct    = round((on_time / total_payments) * 100, 1) if total_payments else 0
        total_loans    = Loan.objects.filter(member=m).count()
        overdue        = Loan.objects.filter(member=m, status='Overdue').count()
        total_paid     = float(payments.aggregate(t=Sum('amount'))['t'] or 0)

        score = max(0, min(100, on_time_pct - (overdue * 10)))

        # ── ADDED: savings balance per member ────────────────────
        dep = float(Savings.objects.filter(member=m, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
        wth = float(Savings.objects.filter(member=m, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)
        savings_balance = dep - wth

        if total_payments > 0:
            result.append({
                'member_id':      m.member_id,
                'name':           m.fullname,
                'classification': m.pre_member.classification if hasattr(m, 'pre_member') and m.pre_member else '—',
                'total_loans':    total_loans,
                'total_payments': total_payments,
                'on_time':        on_time,
                'late':           late,
                'overdue_loans':  overdue,
                'on_time_rate':   on_time_pct,
                'total_paid':     total_paid,
                'score':          score,
                'rating':         'Excellent' if score >= 90 else 'Good' if score >= 70 else 'Fair' if score >= 50 else 'Poor',
                'savings_balance': savings_balance,   # ← NEW
            })

    result.sort(key=lambda x: x['score'], reverse=True)
    return Response(result[:limit])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_borrowers_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    year  = int(request.query_params.get('year', timezone.now().year))
    limit = int(request.query_params.get('limit', 10))

    data = (
        Loan.objects.filter(applied_at__year=year)
        .values('member__member_id', 'member__id')
        .annotate(
            loan_count=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
        )
        .order_by('-loan_count')[:limit]
    )

    result = []
    for d in data:
        try:
            member = Member.objects.get(id=d['member__id'])
            pm     = getattr(member, 'pre_member', None)

            # ── ADDED: savings balance ───────────────────────────
            dep = float(Savings.objects.filter(member=member, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
            wth = float(Savings.objects.filter(member=member, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)

            result.append({
                'member_id':      member.member_id,
                'name':           member.fullname,
                'classification': pm.classification if pm else '—',
                'loan_count':     d['loan_count'],
                'total_amount':   float(d['total_amount'] or 0),
                'avg_amount':     float(d['avg_amount'] or 0),
                'share_capital':  float(member.share_capital or 0),
                'savings_balance': dep - wth,   # ← NEW
            })
        except Member.DoesNotExist:
            pass

    return Response({'year': year, 'data': result})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_amount_distribution_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    ranges = [
        ('₱3,000 - ₱10,000',   3000,   10000),
        ('₱10,001 - ₱30,000',  10001,  30000),
        ('₱30,001 - ₱50,000',  30001,  50000),
        ('₱50,001 - ₱100,000', 50001, 100000),
        ('₱100,001+',         100001, 999999999),
    ]

    result = []
    for label, min_amt, max_amt in ranges:
        count = Loan.objects.filter(amount__gte=min_amt, amount__lte=max_amt).count()
        total = float(
            Loan.objects.filter(amount__gte=min_amt, amount__lte=max_amt)
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        result.append({'range': label, 'count': count, 'total': total})

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def yearly_comparison_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    current_year = timezone.now().year
    years = [current_year - 2, current_year - 1, current_year]

    result = []
    for year in years:
        collections = float(
            Payment.objects.filter(paid_at__year=year)
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        loan_count  = Loan.objects.filter(applied_at__year=year).count()
        loan_amount = float(
            Loan.objects.filter(applied_at__year=year)
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        new_members = Member.objects.filter(membership_date__year=year).count()

        # ── ADDED: savings deposits per year ─────────────────────
        savings_dep = float(
            Savings.objects.filter(transaction_type='Deposit', created_at__year=year)
            .aggregate(t=Sum('amount'))['t'] or 0
        )

        result.append({
            'year':        year,
            'collections': collections,
            'loan_count':  loan_count,
            'loan_amount': loan_amount,
            'new_members': new_members,
            'savings_dep': savings_dep,   # ← NEW
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def share_capital_growth_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    members = Member.objects.filter(share_capital__gt=0).order_by('-share_capital')[:20]

    result = []
    for m in members:
        loan_count  = Loan.objects.filter(member=m, status__in=['Active', 'Completed']).count()
        total_loans = float(
            Loan.objects.filter(member=m, status__in=['Active', 'Completed'])
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        pm = getattr(m, 'pre_member', None)

        # ── ADDED: savings balance ───────────────────────────────
        dep = float(Savings.objects.filter(member=m, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or 0)
        wth = float(Savings.objects.filter(member=m, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or 0)

        result.append({
            'member_id':      m.member_id,
            'name':           m.fullname,
            'classification': pm.classification if pm else '—',
            'share_capital':  float(m.share_capital),
            'max_loanable':   float(m.share_capital),
            'loan_count':     loan_count,
            'total_loaned':   total_loans,
            'savings_balance': dep - wth,   # ← NEW
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overdue_analysis_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    overdue_loans    = Loan.objects.filter(status='Overdue').select_related('member')
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

    year = int(request.query_params.get('year', timezone.now().year))
    data = (
        Loan.objects.filter(applied_at__year=year)
        .annotate(month=TruncMonth('applied_at'))
        .values('month')
        .annotate(count=Count('id'), total=Sum('amount'))
        .order_by('month')
    )
    return Response([
        {'month': d['month'].strftime('%b'), 'count': d['count'], 'total': float(d['total'] or 0)}
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
        payments = Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt)
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
        total_all = float(
            Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt)
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        rows = [[m['month'].strftime('%B %Y'), m['count'], f'₱{float(m["total"]):,.2f}'] for m in monthly]
        return {
            'summary':        [('Total Collected', f'₱{total_all:,.2f}'), ('Months with Data', len(rows))],
            'columns':        ['Month', 'No. of Transactions', 'Total Collected'],
            'rows':           rows,
            'col_widths':     [20, 22, 22],
            'col_widths_pdf': [6, 6, 6],
        }

    elif report_type == 'Loan Summary':
        loans = Loan.objects.filter(applied_at__date__gte=df, applied_at__date__lte=dt)
        rows  = []
        for l in loans.select_related('member').order_by('-applied_at'):
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
                ('Total Amount Released',  f'₱{total_amt:,.2f}'),
                ('Active Loans',           loans.filter(status='Active').count()),
                ('Overdue Loans',          loans.filter(status='Overdue').count()),
            ],
            'columns':        ['Loan ID', 'Member Name', 'Member ID', 'Type', 'Amount', 'Balance', 'Monthly Due', 'Term', 'Status', 'Date Applied'],
            'rows':           rows,
            'col_widths':     [16, 20, 14, 16, 14, 14, 13, 7, 12, 14],
            'col_widths_pdf': [2.2, 3.5, 2.2, 2.5, 2.2, 2.2, 2.2, 1.5, 2, 2.5],
        }

    elif report_type == 'Member Report':
        members = Member.objects.filter(membership_date__gte=df, membership_date__lte=dt)
        rows    = []
        for m in members.order_by('member_id'):
            pm = getattr(m, 'pre_member', None)
            rows.append([
                m.member_id, m.last_name, m.first_name,
                pm.classification if pm else '—', m.contact,
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
        overdue_count = Loan.objects.filter(status='Overdue').count()
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
        members = Member.objects.filter(loans__isnull=False).distinct()
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
            total_p  = on_time + late
            rate     = round((on_time / total_p) * 100, 1) if total_p else 0
            overdue  = Loan.objects.filter(member=m, status='Overdue').count()
            score    = max(0, min(100, rate - (overdue * 10)))
            rating   = 'Excellent' if score >= 90 else 'Good' if score >= 70 else 'Fair' if score >= 50 else 'Poor'
            pm       = getattr(m, 'pre_member', None)
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

    # ── NEW: Savings Report ───────────────────────────────────────────────────
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
                ('Total Deposits',    f'₱{total_deposits:,.2f}'),
                ('Total Withdrawals', f'₱{total_withdrawals:,.2f}'),
                ('Net Savings',       f'₱{net_savings:,.2f}'),
                ('Total Transactions', savings.count()),
                ('Period',            f'{date_from_str} to {date_to_str}'),
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
    filename = f"LEAF_MPC_{report_type.replace(' ', '_')}_{date_from}_to_{date_to}.xlsx"
    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


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
    data = build_report_data(report_type, date_from, date_to)
    return Response({
        'report_type': report_type,
        'date_from':   date_from,
        'date_to':     date_to,
        'summary':     data.get('summary', []),
        'columns':     data.get('columns', []),
        'rows':        data.get('rows', [])[:50],
        'total_rows':  len(data.get('rows', [])),
    })
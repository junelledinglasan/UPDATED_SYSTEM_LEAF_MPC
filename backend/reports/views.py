from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

# ── Updated imports — use LeafMemberInfo instead of MembershipApplication ──
from members.models import Member, LeafMemberInfo
from loans.models import Loan
from payments.models import Payment


# ══════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    total_releases = float(
        Loan.objects.filter(status__in=['Active', 'Completed'])
        .aggregate(t=Sum('amount'))['t'] or 0
    )
    total_paid = float(Payment.objects.aggregate(t=Sum('amount'))['t'] or 0)
    rate = round((total_paid / total_releases) * 100, 1) if total_releases else 0

    return Response({
        'total_members':         Member.objects.count(),
        'active_members':        Member.objects.filter(membership_status='Active').count(),
        'inactive_members':      Member.objects.filter(membership_status='Inactive').count(),
        'pending_applications':  LeafMemberInfo.objects.filter(application_status='Pending').count(),
        'approved_applications': LeafMemberInfo.objects.filter(application_status='Approved').count(),
        'total_loans':           Loan.objects.count(),
        'active_loans':          Loan.objects.filter(status='Active').count(),
        'overdue_loans':         Loan.objects.filter(status='Overdue').count(),
        'pending_loans':         Loan.objects.filter(status='For Review').count(),
        'total_releases':        total_releases,
        'avg_loan_amount':       float(Loan.objects.aggregate(a=Avg('amount'))['a'] or 0),
        'total_collection':      total_paid,
        'collection_rate':       rate,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_collection_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    data = (
        Payment.objects
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
    data = Loan.objects.values('status').annotate(count=Count('id'))
    return Response({d['status']: d['count'] for d in data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loan_type_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)
    data = Loan.objects.values('loan_type').annotate(count=Count('id'))
    return Response({d['loan_type']: d['count'] for d in data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_behavior_view(request):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    overdue_count = Loan.objects.filter(status='Overdue').count()
    payments      = Payment.objects.select_related('loan').all()
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
        'On Time': round((on_time       / total) * 100, 1),
        'Late':    round((late          / total) * 100, 1),
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
        released = float(loans.filter(status__in=['Active','Completed']).aggregate(t=Sum('amount'))['t'] or 0)
        rows = []
        for p in payments.select_related('member','loan').order_by('-paid_at'):
            rows.append([
                p.paid_at.strftime('%Y-%m-%d'),
                p.tx_id,
                p.member.fullname,
                p.member.member_id,
                p.loan.loan_id,
                f'₱{float(p.amount):,.2f}',
                f'₱{float(p.balance):,.2f}',
                p.recorded_by,
            ])
        return {
            'summary': [
                ('Total Collected',      f'₱{total:,.2f}'),
                ('Total Transactions',   count),
                ('Total Loan Releases',  f'₱{released:,.2f}'),
                ('Period',               f'{date_from_str} to {date_to_str}'),
            ],
            'columns':        ['Date','TX ID','Member Name','Member ID','Loan ID','Amount','Balance After','Recorded By'],
            'rows':           rows,
            'col_widths':     [14,20,20,14,16,14,15,15],
            'col_widths_pdf': [2.2,2.8,3.5,2.2,2.5,2.2,2.5,2.2],
        }

    elif report_type == 'Collection Report':
        monthly   = (
            Payment.objects
            .filter(paid_at__date__gte=df, paid_at__date__lte=dt)
            .annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        total_all = float(Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).aggregate(t=Sum('amount'))['t'] or 0)
        rows      = [[m['month'].strftime('%B %Y'), m['count'], f'₱{float(m["total"]):,.2f}'] for m in monthly]
        return {
            'summary':  [('Total Collected', f'₱{total_all:,.2f}'), ('Months with Data', len(rows))],
            'columns':        ['Month','No. of Transactions','Total Collected'],
            'rows':           rows,
            'col_widths':     [20,22,22],
            'col_widths_pdf': [6,6,6],
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
                ('Total Loans',          loans.count()),
                ('Total Amount Released', f'₱{total_amt:,.2f}'),
                ('Active Loans',         loans.filter(status='Active').count()),
                ('Overdue Loans',        loans.filter(status='Overdue').count()),
            ],
            'columns':        ['Loan ID','Member Name','Member ID','Type','Amount','Balance','Monthly Due','Term','Status','Date Applied'],
            'rows':           rows,
            'col_widths':     [16,20,14,16,14,14,13,7,12,14],
            'col_widths_pdf': [2.2,3.5,2.2,2.5,2.2,2.2,2.2,1.5,2,2.5],
        }

    elif report_type == 'Member Report':
        members = Member.objects.filter(created_at__date__gte=df, created_at__date__lte=dt)
        rows    = []
        for m in members.order_by('member_id'):
            rows.append([
                m.member_id, m.last_name, m.first_name,
                m.classification, m.contact,
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
            'columns':        ['Member ID','Last Name','First Name','Classification','Contact','Status','Date Registered'],
            'rows':           rows,
            'col_widths':     [14,16,16,16,14,12,16],
            'col_widths_pdf': [2.2,2.8,2.8,2.8,2.5,1.8,2.5],
        }

    elif report_type == 'Payment Behavior':
        payments      = Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).select_related('loan','member')
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
            'columns':        ['Payment Date','Member Name','Member ID','Loan ID','Due Date','Amount Paid','Status'],
            'rows':           rows,
            'col_widths':     [14,22,14,16,14,15,12],
            'col_widths_pdf': [2.5,4,2.5,2.5,2.5,2.5,2],
        }

    elif report_type == 'Blockchain Audit Log':
        payments = Payment.objects.filter(paid_at__date__gte=df, paid_at__date__lte=dt).select_related('member','loan').order_by('-paid_at')
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
            'columns':        ['Date & Time','TX ID','Member','Member ID','Loan ID','Amount','Balance','Hash','By'],
            'rows':           rows,
            'col_widths':     [16,20,20,14,14,13,14,30,14],
            'col_widths_pdf': [2.5,3,3.5,2.2,2.2,2,2,4.5,2],
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
    filename = f"LEAF_MPC_{report_type.replace(' ','_')}_{date_from}_to_{date_to}.xlsx"
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
    filename = f"LEAF_MPC_{report_type.replace(' ','_')}_{date_from}_to_{date_to}.pdf"
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
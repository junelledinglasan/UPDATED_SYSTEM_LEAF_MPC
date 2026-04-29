from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from members.models import Member, MembershipApplication
from loans.models import Loan
from payments.models import Payment


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
    rate       = round((total_paid / total_releases) * 100, 1) if total_releases else 0

    return Response({
        'total_members':         Member.objects.count(),
        'active_members':        Member.objects.filter(status='Active').count(),
        'inactive_members':      Member.objects.filter(status='Inactive').count(),
        'pending_applications':  MembershipApplication.objects.filter(status='Pending').count(),
        'approved_applications': MembershipApplication.objects.filter(status='Approved').count(),
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
    """
    Computes payment behavior based on real payment records vs loan due dates.

    Logic:
    - ON TIME  = payment was recorded on or before next_due_date
    - LATE     = payment was recorded after next_due_date (but loan not overdue)
    - OVERDUE  = loan status is Overdue (no payment made when due)
    """
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    import datetime

    # Count overdue loans (no payment made on time)
    overdue_count = Loan.objects.filter(status='Overdue').count()

    # Get all payments with their loan's due date
    payments = Payment.objects.select_related('loan').all()

    on_time_count = 0
    late_count    = 0

    for payment in payments:
        loan = payment.loan
        if loan.next_due_date:
            # Compare payment date vs loan due date
            pay_date = payment.paid_at.date()
            due_date = loan.next_due_date
            if pay_date <= due_date:
                on_time_count += 1
            else:
                late_count += 1
        else:
            # No due date set — count as on time
            on_time_count += 1

    total = on_time_count + late_count + overdue_count

    if total == 0:
        return Response({
            'On Time':  0,
            'Late':     0,
            'Overdue':  0,
        })

    return Response({
        'On Time': round((on_time_count / total) * 100, 1),
        'Late':    round((late_count    / total) * 100, 1),
        'Overdue': round((overdue_count / total) * 100, 1),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_view(request):
    if request.user.role != 'admin':
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
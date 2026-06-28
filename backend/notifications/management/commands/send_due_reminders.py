"""
Django management command — send 3-day due date reminders.
Run daily via Windows Task Scheduler:
  python manage.py send_due_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from loans.models import Loan
from notifications.email_utils import send_due_date_reminder_email


class Command(BaseCommand):
    help = 'Send email reminders to members with payments due in 3 days'

    def handle(self, *args, **options):
        today      = timezone.now().date()
        target     = today + timedelta(days=3)
        loans      = Loan.objects.filter(
            status='Active',
            next_due_date=target,
        ).select_related('member', 'member__user', 'member__pre_member')

        sent = 0
        for loan in loans:
            member = loan.member
            email  = (
                getattr(member, 'email', None) or
                getattr(getattr(member, 'pre_member', None), 'email', None) or
                getattr(getattr(member, 'user', None), 'email', None)
            )
            if not email:
                self.stdout.write(f'  [SKIP] {member.member_id} — no email')
                continue

            ok = send_due_date_reminder_email(
                email      = email,
                fullname   = member.fullname,
                member_id  = member.member_id,
                loan_id    = loan.loan_id,
                loan_type  = loan.loan_type,
                monthly_due= loan.monthly_due,
                due_date   = str(loan.next_due_date),
                balance    = loan.balance,
            )
            if ok:
                sent += 1
                self.stdout.write(f'  [SENT] {member.member_id} → {email}')
            else:
                self.stdout.write(f'  [FAIL] {member.member_id} → {email}')

        self.stdout.write(self.style.SUCCESS(f'\nDone! {sent}/{loans.count()} reminders sent.'))
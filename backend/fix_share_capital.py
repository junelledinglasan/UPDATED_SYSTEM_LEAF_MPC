"""
One-time fix script — i-run sa Django shell:
exec(open('fix_share_capital.py', encoding='utf-8').read())

Logic:
- Base SC = 8000 (initial)
- +3% CBU per approved/active/completed/overdue loan
- +manual deposits (ShareCapitalTransaction)
- IF total active loans > max_loanable (SC x 2):
    adjust SC so that max_loanable >= total active loans
"""

from decimal import Decimal
from members.models import Member, ShareCapitalTransaction
from loans.models import Loan
from django.db.models import Sum

BASE_SC = Decimal('8000.00')

fixed   = 0
skipped = 0
errors  = []

print("=" * 65)
print("SHARE CAPITAL RECALCULATION + LOAN ALIGNMENT")
print("=" * 65)

for member in Member.objects.all().order_by('member_id'):
    try:
        # ── CBU from approved loans ──
        loans = Loan.objects.filter(
            member=member,
            status__in=['Active', 'Overdue', 'Completed']
        )
        total_cbu = sum(loan.amount * Decimal('0.03') for loan in loans)

        # ── Manual SC deposits ──
        manual_txns = ShareCapitalTransaction.objects.filter(member=member)
        manual_total = sum(
            t.amount if t.txn_type in ['Deposit', 'CBU', 'Initial'] else -t.amount
            for t in manual_txns
        )

        # ── Expected SC from CBU + manual ──
        expected_sc = BASE_SC + total_cbu + manual_total

        # ── Check if active loans exceed max_loanable ──
        active_loans = Loan.objects.filter(
            member=member,
            status__in=['Active', 'Overdue']
        )
        total_active = active_loans.aggregate(t=Sum('amount'))['t'] or Decimal('0')

        # Max loanable = SC x 2
        # If total active > SC x 2, adjust SC so SC x 2 >= total active
        # Minimum SC needed = total_active / 2 (rounded up to nearest 50)
        if total_active > 0:
            min_sc_needed = total_active / Decimal('2')
            # Round up to nearest 50
            import math
            min_sc_needed = Decimal(str(math.ceil(float(min_sc_needed) / 50) * 50))
            if min_sc_needed > expected_sc:
                expected_sc = min_sc_needed

        old_sc = member.share_capital

        if abs(old_sc - expected_sc) > Decimal('0.01'):
            member.share_capital = expected_sc
            member.save()
            max_loan = float(expected_sc) * 2
            print(f"✅ {member.member_id} | {member.fullname}")
            print(f"   SC: ₱{old_sc:,.2f} → ₱{expected_sc:,.2f} | Max Loanable: ₱{max_loan:,.2f} | Active: ₱{total_active:,.2f}")
            fixed += 1
        else:
            print(f"⏭  {member.member_id} | {member.fullname} — OK (SC: ₱{old_sc:,.2f} | Max: ₱{float(old_sc)*2:,.2f} | Active: ₱{total_active:,.2f})")
            skipped += 1

    except Exception as e:
        errors.append(f"{member.member_id}: {e}")
        print(f"❌ {member.member_id} ERROR: {e}")

print("\n" + "=" * 65)
print(f"DONE — Fixed: {fixed} | Skipped: {skipped} | Errors: {len(errors)}")
print("=" * 65)
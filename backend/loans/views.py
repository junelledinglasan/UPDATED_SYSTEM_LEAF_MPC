import datetime
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from notifications.email_utils import send_loan_approved_email, send_gcash_verified_email, send_gcash_rejected_email, send_loan_declined_email, send_loan_approved_pending_release_email
from dateutil.relativedelta import relativedelta

from activity_log.utils import log_activity
from .models import Loan
from .serializers import LoanSerializer, CreateLoanSerializer
from django.utils import timezone as tz


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def loan_list_view(request):
    if request.method == 'GET':
        # ── BAGO: awtomatikong che-check at ia-apply ang 2% penalty
        # dito, tuwing may humihiling ng listahan ng loans (hal.
        # binubuksan ang Loan Payment page sa web/mobile) — hindi na
        # kailangan ng cron job o manual na "python manage.py
        # apply_loan_penalties" command para gumana ito. Magaan lang
        # ito dahil "apply_overdue_penalty()" mismo ay may built-in na
        # early-return kung hindi naman talaga overdue ang isang loan. ──
        for loan in Loan.objects.filter(status__in=['Active', 'Overdue']):
            loan.apply_overdue_penalty()

        loans = Loan.objects.select_related(
            'member', 'member__pre_member', 'member__user',
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

        # ── If F2F loan (created as Active by serializer), do post-approval tasks ──
        if loan.status == 'Active':
            import datetime
            from members.models import Savings
            from django.db.models import Sum
            from dateutil.relativedelta import relativedelta

            loan.approved_at   = timezone.now()
            loan.approved_by   = request.user.username
            loan.next_due_date = datetime.date.today() + relativedelta(months=1)

            # ── FIX: dating "loan.amount * Decimal('0.03')" (CBU) at
            # "loan.amount * Decimal('0.01')" (SD) na naka-hardcode para
            # sa LAHAT ng loan types — mali, dahil WALANG CBU/SD ang
            # Appliance Loan at Petty Cash Loan. Ngayon, BINABASA na
            # ang ACTUAL na naka-store na rates sa loan mismo (hindi na
            # kino-compute ulit) — ito ang nagpapagana sa "Edit Rates"
            # feature ng admin: kung ni-customize ng admin ang CBU/SD
            # bago i-submit, ITO na ang gagamitin dito, hindi na ang
            # default. ──────────────────────────────────────────────────
            # ── FIX: "loan.cbu_rate"/"loan.sd_rate" ay naka-store bilang
            # "float" sa modelo, pero "Decimal" naman ang "loan.amount" —
            # bawal i-multiply nang direkta ang Decimal at float sa
            # Python ("TypeError: unsupported operand type(s) for *:
            # 'decimal.Decimal' and 'float'"). Kaya kino-convert muna dito
            # papuntang Decimal (via str() para walang floating-point
            # rounding artifacts, hal. 0.03 na naging 0.029999999999999999). ──
            cbu_rate = Decimal(str(loan.cbu_rate))
            sd_rate  = Decimal(str(loan.sd_rate))

            if cbu_rate > 0:
                share_capital_addition = loan.amount * cbu_rate
                loan.member.share_capital += share_capital_addition
                loan.member.save()
            else:
                share_capital_addition = Decimal('0')

            if sd_rate > 0:
                savings_deposit = loan.amount * sd_rate
                total_dep = Savings.objects.filter(member=loan.member, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or Decimal('0')
                total_wdr = Savings.objects.filter(member=loan.member, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or Decimal('0')
                new_balance = (total_dep - total_wdr) + savings_deposit
                Savings.objects.create(
                    member=loan.member, transaction_type='Deposit', amount=savings_deposit,
                    balance_after=new_balance,
                    note=f'Auto-deposit from F2F loan {loan.loan_id} ({int(sd_rate*100)}% savings deposit)',
                    recorded_by=request.user.username,
                )
            else:
                savings_deposit = Decimal('0')

            loan.save()
            log_activity('loan', f'F2F Loan created & activated: {loan.loan_id} — {loan.member.fullname}', request.user)

            # ── BAGO: irecord din sa blockchain ang Loan Release (hindi
            # lang ang mga sunod-sunod na payment) — tingnan ang
            # "_record_loan_release_blockchain()" helper sa ibaba ng file
            # na 'to, ginagamit din sa "Confirm Release" (Active) flow ng
            # online-submitted loans. ─────────────────────────────────────
            _record_loan_release_blockchain(loan, share_capital_addition, savings_deposit, request.user.username)

        return Response(LoanSerializer(loan).data, status=201)

    print(f"[LOAN CREATE ERROR] {s.errors}")
    return Response(s.errors, status=400)


# ══════════════════════════════════════════════════════════════════════════════
# BAGO: irecord sa Polygon blockchain ang BUONG deduction breakdown ng isang
# Loan Release (hindi lang ang mga payment/hulog pagkatapos). REUSES ang
# parehong "recordPayment" contract function (walang bagong Solidity function
# o redeploy na kailangan) — tingnan ang "record_loan_release_on_blockchain()"
# sa payments/blockchain.py para sa detalye kung paano ito nagiging
# comprehensive/tamper-proof kahit parehong function lang ang tinatawag.
#
# Ginagamit ang mga ACTUAL na naka-store na rates sa loan mismo (loan.
# service_fee_rate, loan.filing_fee_amt, loan.insurance_rate, loan.cbu_rate,
# loan.sd_rate) — parehong pattern gaya ng ibang bahagi ng file na 'to, para
# tumugma ito sa "Edit Rates" feature ng admin (kung na-customize niya ang
# mga rate bago i-release, ITO ang gagamitin, hindi na ang default).
# ══════════════════════════════════════════════════════════════════════════════
def _record_loan_release_blockchain(loan, share_capital_addition, savings_deposit, recorded_by):
    from payments.models import LoanRelease
    from payments.blockchain import record_loan_release_on_blockchain

    try:
        amount       = loan.amount
        term         = loan.term_months
        # ── FIX: "loan.interest_rate" ay "float" rin pala sa modelo
        # (gaya ng cbu_rate/sd_rate/service_fee_rate/insurance_rate) —
        # dapat Decimal muna bago i-divide/i-multiply sa Decimal na
        # "amount". loan.interest_rate ay naka-store bilang ANNUAL
        # percentage (monthly_rate × 12 × 100) — ibinabalik dito pabalik
        # sa monthly decimal rate para makuha ang tamang "Interest"
        # deduction. ─────────────────────────────────────────────────────
        interest_rate = Decimal(str(loan.interest_rate)) if loan.interest_rate else Decimal('0')
        monthly_rate  = interest_rate / Decimal('1200') if interest_rate else Decimal('0')

        # ── FIX: parehong Decimal/float multiplication bug — sinisiguro
        # dito na Decimal muna ang mga rate bago i-multiply sa Decimal na
        # "amount" (safe ito kahit Decimal na talaga ang laman, dahil
        # idempotent ang Decimal(str(...))). ─────────────────────────────
        service_fee_rate = Decimal(str(loan.service_fee_rate))
        insurance_rate    = Decimal(str(loan.insurance_rate))

        interest    = (monthly_rate * amount * term).quantize(Decimal('0.01'))
        service_fee = (amount * service_fee_rate).quantize(Decimal('0.01'))
        # ── FIX: "loan.filing_fee_amt" ay posibleng "float" din — kung
        # gagamitin ang ".quantize()" nito nang direkta at float pala
        # ito, "AttributeError: 'float' object has no attribute
        # 'quantize'". I-convert muna papuntang Decimal para ligtas kahit
        # anong klase (float o Decimal na talaga) ang laman. ────────────
        filing_fee  = Decimal(str(loan.filing_fee_amt)).quantize(Decimal('0.01'))
        insurance   = (amount * insurance_rate).quantize(Decimal('0.01'))

        total_deductions = (interest + service_fee + filing_fee + insurance
                             + savings_deposit + share_capital_addition).quantize(Decimal('0.01'))
        net_proceeds     = (amount - total_deductions).quantize(Decimal('0.01'))

        release = LoanRelease.objects.create(
            loan              = loan,
            member            = loan.member,
            principal         = amount,
            interest          = interest,
            service_fee       = service_fee,
            filing_fee        = filing_fee,
            insurance         = insurance,
            savings_deposit   = savings_deposit,
            share_capital_cbu = share_capital_addition,
            total_deductions  = total_deductions,
            net_proceeds      = net_proceeds,
            recorded_by       = recorded_by,
        )

        bc = record_loan_release_on_blockchain(
            tx_id     = release.tx_id,
            member_id = loan.member.member_id,
            loan_id   = loan.loan_id,
            breakdown = {
                'principal':         str(amount),
                'interest':          str(interest),
                'service_fee':       str(service_fee),
                'filing_fee':        str(filing_fee),
                'insurance':         str(insurance),
                'savings_deposit':   str(savings_deposit),
                'share_capital_cbu': str(share_capital_addition),
                'net_proceeds':      str(net_proceeds),
            },
        )
        release.hash         = bc.get('hash', release.hash)
        release.polygon_tx   = bc.get('tx_hash')
        release.block_number = bc.get('block')
        release.network      = bc.get('network', 'local')
        release.save()
    except Exception as e:
        print(f"[BLOCKCHAIN ERROR] Loan release blockchain record failed for {loan.loan_id}: {e}")


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def loan_detail_view(request, pk):
    try:
        loan = Loan.objects.select_related(
            'member', 'member__pre_member', 'member__user',
        ).get(pk=pk)
    except Loan.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.method == 'GET':
        # ── BAGO: parehong awtomatikong penalty check, para sa
        # sitwasyon na direktang binubuksan ang isang loan nang hindi
        # muna dumaan sa listahan. ────────────────────────────────────
        loan.apply_overdue_penalty()
        return Response(LoanSerializer(loan).data)

    # ══════════════════════════════════════════════════════════════════
    # ── BAGO: MEMBER-SIDE edit/cancel — pinapayagan LANG habang "For
    # Review" pa ang status (bago pa ma-review ng admin), at ang
    # nag-e-edit/cancel ay dapat ang may-ari mismo ng loan. Kapag
    # "Approved" na o iba pa, hindi na dito papasok — babagsak sa
    # admin/staff-only block sa ibaba, na magbabalik ng "Unauthorized"
    # para sa member. ────────────────────────────────────────────────
    # ══════════════════════════════════════════════════════════════════
    if request.user.role == 'member':
        if not loan.member.user_id or loan.member.user_id != request.user.id:
            return Response({'error': 'Unauthorized.'}, status=403)
        if loan.status != 'For Review':
            return Response({'error': 'You can only edit or cancel a loan application while it is still For Review.'}, status=400)

        new_status = request.data.get('status')

        # ── CANCEL ──
        if new_status == 'Cancelled':
            loan.status = 'Cancelled'
            loan.save()
            log_activity('loan',
                f'Loan application cancelled by member: {loan.loan_id} — {loan.member.fullname}',
                request.user)
            return Response(LoanSerializer(loan).data)

        if new_status:
            return Response({'error': 'Invalid status update.'}, status=400)

        # ── EDIT (no 'status' in payload → treat as a details edit) ──
        amount_raw      = request.data.get('amount', loan.amount)
        term_raw        = request.data.get('term_months', loan.term_months)
        purpose         = request.data.get('purpose', loan.purpose)
        collateral      = request.data.get('collateral', loan.collateral)
        loan_type       = request.data.get('loan_type', loan.loan_type)

        try:
            amount = Decimal(str(amount_raw))
            term_months = int(term_raw)
        except (ValueError, TypeError, InvalidOperation):
            return Response({'error': 'Invalid amount or term.'}, status=400)

        if amount < 3000:
            return Response({'error': 'Minimum loan amount is ₱3,000.'}, status=400)

        # ── FIX: dating "float(share_capital) * 2" — hindi ginagamit
        # ang admin-editable na loan_multiplier (1x/2x/3x). ───────────
        max_loanable = loan.member.max_loanable
        if float(amount) > max_loanable:
            return Response({'error': f'Amount exceeds your max loanable of ₱{max_loanable:,.2f}.'}, status=400)

        if not str(purpose).strip():
            return Response({'error': 'Purpose is required.'}, status=400)

        if amount <= 50000:
            monthly_rate = Decimal('0.0125')
        elif amount <= 150000:
            monthly_rate = Decimal('0.01125')
        else:
            monthly_rate = Decimal('0.01')

        # ── FIX: dating "(amount + interest) / term_months" — dito
        # NA-DODOBLE ang interest, dahil ISANG BESES na nakukuha ang
        # interest bilang UPFRONT DEDUCTION (kinaltas na sa Net
        # Proceeds bago pa man ma-release ang pera sa member). Kung
        # idadagdag pa rin ito sa monthly_due, parang doble na ang
        # binabayad ng member — una sa upfront deduction, tapos ulit
        # sa bawat buwanang hulog. Base na lang ngayon sa PRINCIPAL
        # LANG hinati sa term — ang interest ay HINDI na idinadagdag
        # dito dahil nakuha na ito nang isang beses sa release. ────────
        interest      = monthly_rate * amount * term_months
        monthly_due   = amount / term_months
        interest_rate = monthly_rate * 12 * 100

        loan.loan_type     = loan_type
        loan.amount        = amount.quantize(Decimal('0.01'))
        loan.term_months   = term_months
        loan.purpose       = purpose
        loan.collateral    = collateral
        loan.monthly_due   = monthly_due.quantize(Decimal('0.01'))
        loan.balance       = amount.quantize(Decimal('0.01'))
        loan.interest_rate = interest_rate.quantize(Decimal('0.01'))
        loan.save()

        log_activity('loan',
            f'Loan application edited by member: {loan.loan_id} — {loan.member.fullname} — ₱{loan.amount:,.2f}',
            request.user)
        return Response(LoanSerializer(loan).data)

    # ══════════════════════════════════════════════════════════════════
    # ── ADMIN/STAFF path (existing — unchanged) ──
    # ══════════════════════════════════════════════════════════════════
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    new_status = request.data.get('status')
    if new_status:
        if new_status == 'Approved':
            # ── BAGO: guard laban sa race condition — posibleng na-
            # cancel na ng member ang loan na ito (o na-process na ng
            # ibang admin session) habang stale pa ang datos na
            # kinukuha ng kasalukuyang view. Kailangang "For Review"
            # pa talaga bago payagang mag-Approve. ────────────────────
            if loan.status != 'For Review':
                return Response({'error': f'This loan is no longer For Review (current status: {loan.status}). It may have been cancelled or already processed.'}, status=400)

            # ── BAGO: Approve lang — HINDI pa naibibigay ang pera.
            # Walang CBU, walang savings deposit, walang due date pa.
            # Ang mga 'yon ay mangyayari lang pagka-"Confirm Release"
            # (new_status == 'Active', ibaba). ───────────────────────
            loan.status       = 'Approved'
            loan.approved_at  = timezone.now()
            loan.approved_by  = request.user.username

            log_activity('loan',
                f'Loan approved (waiting for release): {loan.loan_id} — {loan.member.fullname} — ₱{loan.amount:,.2f}',
                request.user)

            try:
                pm = getattr(loan.member, 'pre_member', None)
                email_addr = (pm.email if pm else None) or getattr(loan.member.user, 'email', None)
                if email_addr:
                    send_loan_approved_pending_release_email(
                        email=email_addr, fullname=loan.member.fullname,
                        member_id=loan.member.member_id, loan_id=loan.loan_id,
                        loan_type=loan.loan_type, amount=loan.amount,
                    )
            except Exception as e:
                print(f"[EMAIL ERROR] Loan approved-pending-release email failed: {e}")

        elif new_status == 'Active':
            # ── BAGO: "Confirm Release" — dito lang mangyayari ang
            # totoong pag-release ng pera (F2F sa opisina). Dito lang
            # magsisimula ang due date countdown, CBU, at savings
            # deposit — hindi na sa unang "Approve" step. ────────────
            if loan.status != 'Approved':
                return Response({'error': 'Loan must be Approved first before it can be released.'}, status=400)

            # ── FIX: tinanggal ang lokal na "from decimal import
            # Decimal" na dating narito. Dahil sa Python scoping rules,
            # kapag may import/assignment sa isang pangalan KAHIT SAAN
            # sa loob ng function, itinuturing itong LOCAL variable sa
            # BUONG function — kahit may global import na sa taas ng
            # file. Ito ang naging dahilan ng "UnboundLocalError:
            # cannot access local variable 'Decimal'" sa member-edit
            # branch (na tumatakbo bago maabot ang linyang ito). Gamit
            # na lang ngayon ang Decimal mula sa module-level import
            # (linya 2 ng file). ─────────────────────────────────────
            from members.models import Savings
            from django.db.models import Sum

            loan.status        = 'Active'
            loan.released_at   = timezone.now()
            loan.released_by   = request.user.username
            loan.next_due_date = datetime.date.today() + relativedelta(months=1)

            # ── FIX: parehong ayos gaya ng sa F2F flow sa itaas —
            # binabasa na ang ACTUAL na naka-store na rates sa loan
            # mismo (hindi na kino-compute ulit), para gumana ang
            # "Edit Rates" feature ng admin. ────────────────────────────
            # ── FIX: "loan.cbu_rate"/"loan.sd_rate" ay naka-store bilang
            # "float" sa modelo, pero "Decimal" naman ang "loan.amount" —
            # bawal i-multiply nang direkta ang Decimal at float sa
            # Python ("TypeError: unsupported operand type(s) for *:
            # 'decimal.Decimal' and 'float'"). Kaya kino-convert muna dito
            # papuntang Decimal (via str() para walang floating-point
            # rounding artifacts, hal. 0.03 na naging 0.029999999999999999). ──
            cbu_rate = Decimal(str(loan.cbu_rate))
            sd_rate  = Decimal(str(loan.sd_rate))

            if cbu_rate > 0:
                share_capital_addition = loan.amount * cbu_rate
                loan.member.share_capital += share_capital_addition
                loan.member.save()
            else:
                share_capital_addition = Decimal('0')

            if sd_rate > 0:
                savings_deposit = loan.amount * sd_rate
                total_dep = Savings.objects.filter(member=loan.member, transaction_type='Deposit').aggregate(t=Sum('amount'))['t'] or Decimal('0')
                total_wdr = Savings.objects.filter(member=loan.member, transaction_type='Withdraw').aggregate(t=Sum('amount'))['t'] or Decimal('0')
                current_balance = total_dep - total_wdr
                new_balance     = current_balance + savings_deposit

                Savings.objects.create(
                    member=loan.member, transaction_type='Deposit', amount=savings_deposit,
                    balance_after=new_balance,
                    note=f'Auto-deposit from loan {loan.loan_id} ({int(sd_rate*100)}% savings deposit)',
                    recorded_by=request.user.username,
                )
            else:
                savings_deposit = Decimal('0')

            log_activity('loan',
                f'Loan money released & activated: {loan.loan_id} — {loan.member.fullname} — ₱{loan.amount:,.2f} | Share Capital +₱{share_capital_addition:,.2f} | Savings Deposit +₱{savings_deposit:,.2f}',
                request.user)

            # ── BAGO: irecord sa blockchain ang BUONG deduction
            # breakdown ng Loan Release na 'to (hindi lang ang mga
            # sunod-sunod na payment). Tingnan ang helper function sa
            # itaas ng file na 'to. ──────────────────────────────────
            _record_loan_release_blockchain(loan, share_capital_addition, savings_deposit, request.user.username)

            try:
                pm = getattr(loan.member, 'pre_member', None)
                email_addr = (pm.email if pm else None) or getattr(loan.member.user, 'email', None)
                if email_addr:
                    send_loan_approved_email(
                        email=email_addr, fullname=loan.member.fullname,
                        member_id=loan.member.member_id, loan_id=loan.loan_id,
                        loan_type=loan.loan_type, amount=loan.amount,
                        monthly_due=loan.monthly_due, term_months=loan.term_months,
                        next_due_date=str(loan.next_due_date),
                    )
            except Exception as e:
                print(f"[EMAIL ERROR] Loan released/active email failed: {e}")

        elif new_status == 'Declined':
            # ── BAGO: parehong guard — hindi puwedeng i-decline ang
            # loan na hindi na "For Review" (hal. na-cancel na ng
            # member, o na-approve na sa ibang session). ─────────────
            if loan.status != 'For Review':
                return Response({'error': f'This loan is no longer For Review (current status: {loan.status}). It may have been cancelled or already processed.'}, status=400)

            loan.status         = 'Declined'
            loan.decline_reason = request.data.get('decline_reason', '')
            log_activity('loan', f'Loan declined: {loan.loan_id} — {loan.member.fullname}', request.user)

            try:
                pm = getattr(loan.member, 'pre_member', None)
                email_addr = (pm.email if pm else None) or getattr(loan.member.user, 'email', None)
                if email_addr:
                    send_loan_declined_email(
                        email=email_addr, fullname=loan.member.fullname,
                        member_id=loan.member.member_id, loan_id=loan.loan_id,
                        loan_type=loan.loan_type, amount=loan.amount,
                        decline_reason=loan.decline_reason,
                    )
            except Exception as e:
                print(f"[EMAIL ERROR] Loan declined email failed: {e}")
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
        status__in=['Active', 'Overdue'], next_due_date__isnull=False
    ).select_related('member', 'member__pre_member')

    month_str = request.query_params.get('month', '')
    if month_str:
        try:
            year, month = map(int, month_str.split('-'))
            loans = loans.filter(next_due_date__year=year, next_due_date__month=month)
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


# ══════════════════════════════════════════════════════════════════════════════
# GCASH PAYMENT REQUESTS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def gcash_request_list_view(request):
    if request.method == 'GET':
        from .models import GCashPaymentRequest
        if request.user.role in ['admin', 'staff']:
            qs = GCashPaymentRequest.objects.select_related(
                'loan', 'member', 'member__pre_member'
            ).all()
            if s := request.query_params.get('status'):
                qs = qs.filter(status=s)
        else:
            try:
                from members.models import Member
                member = Member.objects.get(user=request.user)
                qs = GCashPaymentRequest.objects.filter(member=member).select_related('loan')
            except Member.DoesNotExist:
                return Response([], status=200)

        return Response([{
            'id':               r.id,
            'loan_id':          r.loan.loan_id,
            'loan_pk':          r.loan.id,
            'member_id':        r.member.member_id,
            'member_name':      r.member.fullname,
            'amount':           float(r.amount),
            'reference_number': r.reference_number,
            'screenshot_url':   r.screenshot_url,
            'status':           r.status,
            'note':             r.note,
            'verified_by':      r.verified_by,
            'verified_at':      str(r.verified_at)[:16] if r.verified_at else '',
            'reject_reason':    r.reject_reason,
            'created_at':       r.created_at.strftime('%Y-%m-%d %H:%M'),
            # ── BAGO: aling GCash account ang ginamit ng member. ────────
            'paid_to_number':   r.paid_to_number,
            'paid_to_name':     r.paid_to_name,
        } for r in qs])

    # POST — member submits
    if request.user.role not in ['member']:
        return Response({'error': 'Only members can submit GCash payment requests.'}, status=403)

    try:
        from members.models import Member
        member = Member.objects.get(user=request.user)
    except Member.DoesNotExist:
        return Response({'error': 'Member profile not found.'}, status=404)

    from .models import GCashPaymentRequest
    data           = request.data
    loan_pk        = data.get('loan_id')
    amount         = data.get('amount')
    ref_no         = data.get('reference_number', '').strip()
    note           = data.get('note', '')
    # ── FIX: dating hindi kinukuha ang screenshot_url mula sa request
    # body — kahit matagumpay na na-upload ng member sa Supabase
    # Storage ang proof of payment (at nakuha nga ang public URL sa
    # frontend), hindi ito naisasave sa database dahil wala itong
    # dinaanan papunta sa .create() call sa ibaba. ────────────────────
    screenshot_url = data.get('screenshot_url', '')
    # ── BAGO: kung aling GCash account ang pinili ng member. ────────────
    paid_to_number = data.get('paid_to_number', '')
    paid_to_name   = data.get('paid_to_name', '')

    if not loan_pk:
        return Response({'error': 'loan_id is required.'}, status=400)
    if not amount or float(amount) <= 0:
        return Response({'error': 'Valid amount is required.'}, status=400)
    if not ref_no:
        return Response({'error': 'GCash reference number is required.'}, status=400)
    if len(ref_no) < 10:
        return Response({'error': 'Invalid reference number format. Must be at least 10 characters.'}, status=400)
    if GCashPaymentRequest.objects.filter(reference_number=ref_no).exists():
        return Response({'error': 'This GCash reference number has already been submitted.'}, status=400)

    try:
        loan = Loan.objects.get(pk=loan_pk, member=member)
    except Loan.DoesNotExist:
        return Response({'error': 'Loan not found.'}, status=404)

    if loan.status not in ['Active', 'Overdue']:
        return Response({'error': 'Payment can only be submitted for active or overdue loans.'}, status=400)

    existing = GCashPaymentRequest.objects.filter(loan=loan, status='Pending').first()
    if existing:
        return Response({'error': f'You already have a pending GCash request (Ref: {existing.reference_number}). Wait for admin verification.'}, status=400)

    req = GCashPaymentRequest.objects.create(
        loan=loan, member=member, amount=float(amount),
        reference_number=ref_no, note=note,
        screenshot_url=screenshot_url,
        paid_to_number=paid_to_number, paid_to_name=paid_to_name,
    )

    log_activity('payment',
        f'GCash payment request: {member.fullname} ({member.member_id}) — Loan {loan.loan_id} — ₱{float(amount):,.2f} — Ref: {ref_no}',
        request.user)

    return Response({
        'id':               req.id,
        'message':          'GCash payment request submitted! Admin will verify and record your payment.',
        'reference_number': ref_no,
        'amount':           float(amount),
        'status':           'Pending',
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gcash_request_detail_view(request, pk):
    from .models import GCashPaymentRequest
    try:
        req = GCashPaymentRequest.objects.select_related(
            'loan', 'member', 'member__pre_member'
        ).get(pk=pk)
    except GCashPaymentRequest.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if request.user.role == 'member':
        from members.models import Member
        try:
            member = Member.objects.get(user=request.user)
            if req.member != member:
                return Response({'error': 'Unauthorized.'}, status=403)
        except Member.DoesNotExist:
            return Response({'error': 'Unauthorized.'}, status=403)

    return Response({
        'id':               req.id,
        'loan_id':          req.loan.loan_id,
        'loan_pk':          req.loan.id,
        'member_id':        req.member.member_id,
        'member_name':      req.member.fullname,
        'amount':           float(req.amount),
        'reference_number': req.reference_number,
        'screenshot_url':   req.screenshot_url,
        'status':           req.status,
        'note':             req.note,
        'verified_by':      req.verified_by,
        'verified_at':      str(req.verified_at)[:16] if req.verified_at else '',
        'reject_reason':    req.reject_reason,
        'created_at':       req.created_at.strftime('%Y-%m-%d %H:%M'),
        # ── BAGO: aling GCash account ang ginamit ng member. ────────────
        'paid_to_number':   req.paid_to_number,
        'paid_to_name':     req.paid_to_name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gcash_verify_view(request, pk):
    if request.user.role not in ['admin', 'staff']:
        return Response({'error': 'Unauthorized.'}, status=403)

    from .models import GCashPaymentRequest
    try:
        req = GCashPaymentRequest.objects.select_related('loan', 'member', 'member__user').get(pk=pk)
    except GCashPaymentRequest.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)

    if req.status != 'Pending':
        return Response({'error': f'Request already {req.status}.'}, status=400)

    action        = request.data.get('action')
    reject_reason = request.data.get('reject_reason', '')

    if action not in ['verify', 'reject']:
        return Response({'error': "action must be 'verify' or 'reject'."}, status=400)

    # ── REJECT ────────────────────────────────────────────────────────────────
    if action == 'reject':
        req.status        = 'Rejected'
        req.reject_reason = reject_reason or 'Payment could not be verified.'
        req.verified_by   = request.user.username
        req.verified_at   = tz.now()
        req.save()

        log_activity('payment',
            f'GCash payment REJECTED: {req.member.fullname} Ref:{req.reference_number} — {req.reject_reason}',
            request.user)

        # ── Send rejected email ──
        try:
            pm = getattr(req.member, 'pre_member', None)
            email_addr = (pm.email if pm else None) or getattr(req.member.user, 'email', None)
            if email_addr:
                send_gcash_rejected_email(
                    email=email_addr, fullname=req.member.fullname,
                    member_id=req.member.member_id, loan_id=req.loan.loan_id,
                    reference_number=req.reference_number,
                    amount=float(req.amount), reject_reason=req.reject_reason,
                )
        except Exception as e:
            print(f"[EMAIL ERROR] GCash rejected email failed: {e}")

        # ── In-app notification ──
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user       = req.member.user,
                title      = "GCash Payment Not Verified ❌",
                message    = f"Your GCash payment (Ref: {req.reference_number}, ₱{float(req.amount):,.2f}) for loan {req.loan.loan_id} was not verified. Reason: {req.reject_reason}. Please resubmit with the correct details.",
                notif_type = "payment",
            )
        except Exception as e:
            print(f"[NOTIF ERROR] {e}")

        return Response({'message': 'Payment request rejected.', 'status': 'Rejected'})

    # ── VERIFY ────────────────────────────────────────────────────────────────
    from decimal import Decimal
    from payments.models import Payment

    loan   = req.loan
    amount = Decimal(str(req.amount))

    new_balance = max(Decimal('0'), loan.balance - amount)

    # ── Create payment (tx_id and hash auto-generated by Payment model) ──
    payment = Payment.objects.create(
        loan        = loan,
        member      = loan.member,
        amount      = amount,
        balance     = new_balance,
        recorded_by = request.user.username,
        note        = f'GCash payment — Ref: {req.reference_number}',
    )

    # ── Record on blockchain ──
    try:
        from payments.blockchain import record_payment_on_blockchain
        bc = record_payment_on_blockchain(
            tx_id     = payment.tx_id,
            member_id = loan.member.member_id,
            loan_id   = loan.loan_id,
            amount    = float(amount),
        )
        payment.hash         = bc.get('hash', payment.hash)
        payment.polygon_tx   = bc.get('tx_hash')
        payment.block_number = bc.get('block')
        payment.network      = bc.get('network', 'local')
        payment.save()
    except Exception as e:
        print(f"[BLOCKCHAIN ERROR] GCash blockchain record failed: {e}")

    tx_id = payment.tx_id
    loan.balance = new_balance
    if new_balance <= 0:
        loan.status  = 'Completed'
        loan.balance = Decimal('0')
    else:
        loan.next_due_date = datetime.date.today() + relativedelta(months=1)
    loan.save()

    req.status      = 'Verified'
    req.verified_by = request.user.username
    req.verified_at = tz.now()
    req.save()

    log_activity('payment',
        f'GCash payment VERIFIED: {req.member.fullname} ({req.member.member_id}) — Loan {loan.loan_id} — ₱{float(amount):,.2f} — Ref: {req.reference_number} — by {request.user.username}',
        request.user)

    # ── Send verified email ──
    try:
        pm = getattr(req.member, 'pre_member', None)
        email_addr = (pm.email if pm else None) or getattr(req.member.user, 'email', None)
        if email_addr:
            send_gcash_verified_email(
                email=email_addr, fullname=req.member.fullname,
                member_id=req.member.member_id, loan_id=loan.loan_id,
                reference_number=req.reference_number,
                amount=float(amount), new_balance=float(new_balance),
            )
    except Exception as e:
        print(f"[EMAIL ERROR] GCash verified email failed: {e}")

    # ── In-app notification ──
    try:
        from notifications.models import Notification
        Notification.objects.create(
            user       = req.member.user,
            title      = "GCash Payment Verified ✅",
            message    = f"Your GCash payment of ₱{float(amount):,.2f} for loan {loan.loan_id} (Ref: {req.reference_number}) has been verified and recorded. New balance: ₱{float(new_balance):,.2f}.",
            notif_type = "payment",
        )
    except Exception as e:
        print(f"[NOTIF ERROR] {e}")

    return Response({
        'message':    f'Payment of ₱{float(amount):,.2f} verified and recorded.',
        'tx_id':      tx_id,
        'new_balance':float(new_balance),
        'loan_status':loan.status,
        'status':     'Verified',
    })
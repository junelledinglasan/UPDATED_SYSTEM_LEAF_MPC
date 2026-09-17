from rest_framework import serializers
from decimal import Decimal
from .models import Loan, get_loan_fee_structure


class LoanSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.fullname',  read_only=True)
    member_code = serializers.CharField(source='member.member_id', read_only=True)
    member      = serializers.PrimaryKeyRelatedField(read_only=True)

    is_f2f = serializers.BooleanField(required=False, default=False, write_only=True)

    # ── BAGO: computed na halaga (piso) ng kabuuang naipong 2%
    # penalty — para hindi na kailangang i-recompute ito ng frontend
    # (months_overdue_penalized × monthly_due × 2%). ───────────────────
    total_penalty = serializers.SerializerMethodField()

    class Meta:
        model  = Loan
        fields = '__all__'

    def get_total_penalty(self, obj):
        from .models import PENALTY_RATE
        return round(float(obj.months_overdue_penalized) * float(obj.monthly_due) * float(PENALTY_RATE), 2)


class CreateLoanSerializer(serializers.ModelSerializer):
    # ── FIX: PALAGING NAKUKUHA BILANG "False" ito dati — dahil hindi
    # ito explicit na naka-declare dito (nasa LoanSerializer lang ito
    # naka-declare, ibang serializer). Basta na-iignore ng DRF ang
    # "is_f2f: true" na ipinapadala ng frontend (hindi kilala ang
    # field na 'to sa serializer na 'to), kaya lagi na lang
    # "validated_data.pop('is_f2f', False)" ang gumagana — palaging
    # "For Review" ang naging status, kahit F2F application. ─────────
    is_f2f = serializers.BooleanField(required=False, default=False, write_only=True)

    # ── BAGO: opsyonal na custom rates — ito ang magpapagana sa "Edit
    # Rates" feature sa admin F2F application (AdminLayout.jsx). Dating
    # kino-compute LANG ulit ng backend ang sarili nitong default at
    # ini-ignore ang anumang binago ng admin dahil wala talagang field
    # dito para dito. "allow_null=True" dahil hindi ipinapadala ng
    # MEMBER self-apply flow ang mga field na 'to (default lang gagamitin). ──
    custom_interest_rate    = serializers.FloatField(required=False, allow_null=True, write_only=True)
    custom_service_fee_rate = serializers.FloatField(required=False, allow_null=True, write_only=True)
    custom_filing_fee       = serializers.FloatField(required=False, allow_null=True, write_only=True)
    custom_cbu_rate         = serializers.FloatField(required=False, allow_null=True, write_only=True)
    custom_insurance_rate   = serializers.FloatField(required=False, allow_null=True, write_only=True)
    custom_sd_rate          = serializers.FloatField(required=False, allow_null=True, write_only=True)

    class Meta:
        model  = Loan
        fields = ['loan_type', 'amount', 'term_months', 'purpose', 'collateral', 'member', 'is_f2f',
                  'custom_interest_rate', 'custom_service_fee_rate', 'custom_filing_fee',
                  'custom_cbu_rate', 'custom_insurance_rate', 'custom_sd_rate']
        extra_kwargs = {
            'member':    { 'required': False },
            'collateral':{ 'required': False },
        }

    def validate(self, data):
        request = self.context.get('request')

        # ── Resolve member ──────────────────────────────────────────────────
        if not data.get('member'):
            if request and getattr(request.user, 'role', None) == 'member':
                from members.models import Member
                try:
                    data['member'] = Member.objects.get(user=request.user)
                except Member.DoesNotExist:
                    raise serializers.ValidationError(
                        {'member': 'No member profile found for this account.'}
                    )
            else:
                raise serializers.ValidationError({'member': 'Member is required.'})

        member = data['member']
        amount = float(data.get('amount', 0))
        loan_type = data.get('loan_type')

        # ── SECURITY: ang "custom_*" rate overrides ay para lang sa
        # ADMIN F2F application (AdminLayout.jsx's "Edit Rates"
        # feature) — kailangan i-strip ito kung hindi admin/staff ang
        # nagpapadala, para maiwasan ang isang member na gumawa ng
        # sariling API request na may 0% interest override sa sarili
        # nilang loan (security vulnerability kung hindi ito i-check). ──
        user_role = getattr(request.user, 'role', None) if request else None
        if user_role not in ('admin', 'staff'):
            for k in ('custom_interest_rate', 'custom_service_fee_rate', 'custom_filing_fee',
                      'custom_cbu_rate', 'custom_insurance_rate', 'custom_sd_rate'):
                data.pop(k, None)

        # ── FIX: dating "amount > 2000" lang ang check (parang may
        # RANGE na kayang gamitin, ₱1 hanggang ₱2,000) — pero FIXED na
        # ₱2,000 LANG talaga ang Petty Cash Loan, hindi variable na
        # halaga. Dating pumasa kahit ₱2 lang, na malaking bug (walang
        # minimum amount check kahit kailan). ────────────────────────────
        if loan_type == 'Petty Cash Loan':
            if amount != 2000:
                raise serializers.ValidationError(
                    {'amount': 'Petty Cash Loan is a fixed amount of ₱2,000.'}
                )
            if int(data.get('term_months', 0)) != 1:
                raise serializers.ValidationError(
                    {'term_months': 'Petty Cash Loan is payable within 1 month only.'}
                )

        # ── 1. Minimum amount (hindi ito applicable sa Petty Cash Loan) ──────
        elif amount < 3000:
            raise serializers.ValidationError(
                {'amount': 'Minimum loan amount is ₱3,000.'}
            )

        # ── 2. Max loanable (base sa admin-editable na loan_multiplier,
        # hindi na naka-hardcode sa "× 2") ─────────────────────────────
        max_loanable = member.max_loanable
        if amount > max_loanable:
            raise serializers.ValidationError(
                {'amount': f'Amount exceeds your max loanable of ₱{max_loanable:,.2f}.'}
            )

        # ── 3. Overdue loan check ───────────────────────────────────────────
        overdue_loans = Loan.objects.filter(member=member, status='Overdue')
        if overdue_loans.exists():
            overdue_ids = ', '.join(l.loan_id for l in overdue_loans)
            raise serializers.ValidationError(
                {'non_field_errors': f'You have overdue loan(s): {overdue_ids}. Please settle them first before applying for a new loan.'}
            )

        # ── 4. Active loan performance check ───────────────────────────────
        # Check if member has active loans with poor payment performance
        # Poor = more than 2 months of missed payments
        from django.utils import timezone
        from datetime import date

        active_loans = Loan.objects.filter(member=member, status='Active')
        for loan in active_loans:
            if loan.next_due_date and loan.next_due_date < date.today():
                days_overdue = (date.today() - loan.next_due_date).days
                if days_overdue > 30:
                    raise serializers.ValidationError(
                        {'non_field_errors': f'Your loan {loan.loan_id} has a missed payment. Please settle your dues before applying for a new loan.'}
                    )

        # ── 5. Existing pending/active loan check ───────────────────────────
        # Allow new application only if member has no active loans, OR if:
        #   (a) an admin/staff is the one submitting (F2F on their behalf), OR
        #   (b) an admin/staff has GRANTED this specific member a one-time
        #       "Loan Override Permission" (via Loan Approval screen). ──────
        existing_active = Loan.objects.filter(
            member=member,
            status__in=['Active', 'For Review', 'Approved']
        )
        if existing_active.exists():
            is_admin_or_staff = request and getattr(request.user, 'role', None) in ['admin', 'staff']
            has_override       = getattr(member, 'loan_override_granted', False)
            if not is_admin_or_staff and not has_override:
                active_ids = ', '.join(l.loan_id for l in existing_active[:3])
                raise serializers.ValidationError(
                    {'non_field_errors': f'You still have an active or pending loan ({active_ids}). Please complete or settle it before applying for a new one.'}
                )

        return data

    def create(self, validated_data):
        amount    = float(validated_data['amount'])
        term      = int(validated_data['term_months'])
        loan_type = validated_data['loan_type']

        # ── FIX: dating ang tiered interest ay BASE LANG SA AMOUNT,
        # hindi isinasaalang-alang ang LOAN TYPE — kaya kahit ATM Loan
        # o Appliance Loan, nakukuha rin nila ang "Regular Loan" na
        # tiered rate (mali, dapat FIXED ang rate ng mga 'yon). Gamit
        # na ngayon ang "get_loan_fee_structure()" — ito ang single
        # source of truth para sa lahat ng rates per loan type. ───────
        fees = get_loan_fee_structure(loan_type, amount)

        # ── BAGO: kung may custom rate na ipinasa (admin F2F "Edit
        # Rates" feature), GAMITIN ito imbes na ang computed default —
        # ito ang nagpapagana sa pag-e-edit ng rates. Ang "None" check
        # (hindi lang "falsy" check) ay sinasadya, dahil 0 ay valid na
        # halaga (hal. 0% CBU) na dapat pa ring gamitin kung sinadya
        # ng admin na i-set sa 0, hindi ito dapat mag-fallback sa
        # default. ───────────────────────────────────────────────────
        custom_interest  = validated_data.pop('custom_interest_rate', None)
        custom_svc_fee   = validated_data.pop('custom_service_fee_rate', None)
        custom_filing    = validated_data.pop('custom_filing_fee', None)
        custom_cbu       = validated_data.pop('custom_cbu_rate', None)
        custom_insurance = validated_data.pop('custom_insurance_rate', None)
        custom_sd        = validated_data.pop('custom_sd_rate', None)

        # ── FIX: ang mga "custom_*" value ay galing sa FloatField (plain
        # Python float), kaya kahit Decimal na ang "fees" (mula sa
        # get_loan_fee_structure() na na-fix na), kapag GINAMIT ang
        # custom override, float pa rin ito — parehong bug pa rin
        # (Decimal * float TypeError) sa oras ng pag-release. I-wrap
        # sa Decimal(str(...)) ang custom values para SIGURADONG
        # Decimal palagi, kahit anong pinagmulan (default o custom). ────
        monthly_rate      = Decimal(str(custom_interest))  if custom_interest  is not None else fees['interest_rate']
        service_fee_rate  = Decimal(str(custom_svc_fee))   if custom_svc_fee   is not None else fees['service_fee_rate']
        filing_fee_amt    = Decimal(str(custom_filing))    if custom_filing    is not None else fees['filing_fee']
        cbu_rate          = Decimal(str(custom_cbu))       if custom_cbu       is not None else fees['cbu_rate']
        insurance_rate    = Decimal(str(custom_insurance)) if custom_insurance is not None else fees['insurance_rate']
        sd_rate           = Decimal(str(custom_sd))        if custom_sd        is not None else fees['sd_rate']

        # ── FIX: dating "(amount + interest) / term" — dito
        # NA-DODOBLE ang interest, dahil ISANG BESES na nakukuha ang
        # interest bilang UPFRONT DEDUCTION (kinaltas na sa Net
        # Proceeds bago pa man ma-release ang pera sa member — tingnan
        # ang mga computation preview sa LoanApplication.jsx/AdminLayout.jsx/
        # new_loan_application_screen.dart, kung saan "Interest" ay
        # kasama sa "Upfront Deductions"). Kung idadagdag pa rin ito sa
        # monthly_due, doble na ang binabayad ng member — una sa upfront
        # deduction, tapos ulit sa bawat buwanang hulog. Base na lang
        # ngayon sa PRINCIPAL LANG hinati sa term (hindi na kailangan
        # ang "interest" variable dito). ─────────────────────────────
        # ── BAGO: Decimal na rin dito (dating plain float, dahil
        # "amount" ay pinilit na naging float sa itaas) — parehong
        # depensang ayos, para hindi na maulit ang Decimal/float
        # mismatch kahit saan pa gamitin ang mga field na 'to. ────────
        monthly_due   = Decimal(str(amount)) / term
        balance       = Decimal(str(amount))
        interest_rate = monthly_rate * 12 * 100

        is_f2f = validated_data.pop('is_f2f', False)

        loan = Loan.objects.create(
            **validated_data,
            monthly_due      = round(monthly_due, 2),
            balance          = round(balance, 2),
            interest_rate    = round(interest_rate, 2),
            # ── BAGO: i-STORE ang ACTUAL na rates na ginamit (default o
            # na-edit ng admin) — ito ang babasahin ng views.py sa oras
            # ng pag-release, hindi na kino-compute ulit. ─────────────
            service_fee_rate = round(service_fee_rate, 4),
            filing_fee_amt   = round(filing_fee_amt, 2),
            cbu_rate         = round(cbu_rate, 4),
            insurance_rate   = round(insurance_rate, 4),
            sd_rate          = round(sd_rate, 4),
            status        = 'Active' if is_f2f else 'For Review',
        )

        # ── BAGO: Kung nagamit ang "Loan Override Permission", i-reset
        # ito pagkatapos — isang-beses lang na pahintulot ito, hindi
        # dapat manatiling bukas magpakailanman. ───────────────────────
        member = loan.member
        if getattr(member, 'loan_override_granted', False):
            member.loan_override_granted = False
            member.loan_override_reason  = ''
            member.save(update_fields=['loan_override_granted', 'loan_override_reason'])

        return loan
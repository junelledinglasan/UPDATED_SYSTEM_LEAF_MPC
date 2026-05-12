from rest_framework import serializers
from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.fullname',  read_only=True)
    member_code = serializers.CharField(source='member.member_id', read_only=True)
    member      = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model  = Loan
        fields = '__all__'


class CreateLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Loan
        fields = ['loan_type', 'amount', 'term_months', 'purpose', 'collateral', 'member']
        extra_kwargs = {
            'member':    { 'required': False },
            'collateral':{ 'required': False },
        }

    def validate(self, data):
        request = self.context.get('request')

        # ── Auto-resolve member from logged-in user (member role) ────────────
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

        # ── Validate amount ──────────────────────────────────────────────────
        amount = float(data.get('amount', 0))
        if amount < 3000:
            raise serializers.ValidationError(
                {'amount': 'Minimum loan amount is ₱3,000.'}
            )

        return data

    def create(self, validated_data):
        amount = float(validated_data['amount'])
        term   = int(validated_data['term_months'])

        # ── LEAF MPC Interest Rate ────────────────────────────────────────────
        if amount <= 50000:
            monthly_rate = 0.0125
        elif amount <= 150000:
            monthly_rate = 0.01125
        else:
            monthly_rate = 0.01

        # ── Compute monthly_due and balance ───────────────────────────────────
        interest    = monthly_rate * amount * term
        monthly_due = (amount + interest) / term
        balance     = amount   # balance starts at full loan amount

        # ── Compute interest_rate (annualized for model field) ────────────────
        interest_rate = monthly_rate * 12 * 100  # store as percent per year

        loan = Loan.objects.create(
            **validated_data,
            monthly_due   = round(monthly_due, 2),
            balance       = round(balance, 2),
            interest_rate = round(interest_rate, 2),
            status        = 'For Review',
        )
        return loan
from rest_framework import serializers
from .models import Loan


class LoanSerializer(serializers.ModelSerializer):
    member_name  = serializers.CharField(source='member.fullname',      read_only=True)
    member_code  = serializers.CharField(source='member.member_id',     read_only=True)
    member_share = serializers.DecimalField(
        source='member.share_capital',
        max_digits=12, decimal_places=2,
        read_only=True
    )

    class Meta:
        model  = Loan
        fields = '__all__'
        read_only_fields = ['loan_id', 'applied_at']


class CreateLoanSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Loan
        fields = ['member', 'loan_type', 'amount', 'term_months', 'purpose', 'collateral']

    def create(self, validated_data):
        amount  = float(validated_data['amount'])
        term    = validated_data['term_months']
        r       = 0.05 / 12
        monthly = amount * r / (1 - (1 + r) ** -term)

        validated_data['monthly_due']   = round(monthly, 2)
        validated_data['balance']       = amount
        validated_data['interest_rate'] = 5.00
        return super().create(validated_data)
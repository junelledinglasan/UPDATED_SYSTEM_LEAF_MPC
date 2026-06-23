import json
import hashlib
from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    member_name  = serializers.CharField(source='member.fullname',  read_only=True)
    member_code  = serializers.CharField(source='member.member_id', read_only=True)
    loan_code    = serializers.CharField(source='loan.loan_id',     read_only=True)
    explorer_url = serializers.ReadOnlyField()
    # ── FIX: strip timezone offset — consistent format, walang +08:00 suffix ──
    paid_at      = serializers.DateTimeField(format="%Y-%m-%dT%H:%M:%S", read_only=True)

    class Meta:
        model  = Payment
        fields = '__all__'
        read_only_fields = ['tx_id', 'hash', 'paid_at', 'balance', 'recorded_by',
                            'polygon_tx', 'block_number', 'network']


class CreatePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Payment
        fields = ['loan', 'member', 'amount', 'note']

    def _generate_hash(self, tx_id, member_id, loan_id, amount):
        payload = json.dumps({
            'tx_id':     tx_id,
            'member_id': str(member_id),
            'loan_id':   str(loan_id),
            'amount':    str(amount),
        }, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def create(self, validated_data):
        loan   = validated_data['loan']
        member = validated_data['member']
        amount = float(validated_data['amount'])

        # ── Update loan balance ──
        new_balance  = float(loan.balance) - amount
        loan.balance = max(new_balance, 0)
        if loan.balance == 0:
            loan.status = 'Completed'
        loan.save()

        validated_data['balance']     = loan.balance
        validated_data['recorded_by'] = self.context['request'].user.username

        # ── Pre-generate tx_id and hash so NOT NULL constraints are met ──
        from django.utils import timezone
        import random, string
        ts     = timezone.now().strftime('%m%d%H%M%S')
        suffix = ''.join(random.choices(string.digits, k=3))
        tx_id  = f"TX-{ts}-{suffix}"  # max ~16 chars, well under VARCHAR(30)

        hash_val = self._generate_hash(tx_id, member.member_id, loan.loan_id, amount)

        validated_data['tx_id']   = tx_id
        validated_data['hash']    = hash_val
        validated_data['network'] = 'local'  # default, updated after blockchain call

        return super().create(validated_data)
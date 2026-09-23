from rest_framework import serializers
from .models import Payment
# ── FIX: tinanggal ang sariling "_generate_hash()" ng klase na ito sa
# ibaba (gumagamit ito ng "float(amount)", na IBA ang str() representation
# sa "Decimal" — hal. "1000.0" vs "1000.00" — kaysa sa kung paano ito
# ire-recompute mula sa database sa ibang pagkakataon, gaya ng "Verify
# Integrity" endpoint. Ginagamit na lang ngayon ang IISANG
# "generate_payment_hash()" mula sa blockchain.py, na siya na ring
# ginagamit ng Payment model at ng verify endpoint — laging magkakatugma
# ang basehan ng hash kahit saan pa ito kino-compute. ────────────────────
from .blockchain import generate_payment_hash


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

        # ── BAGO: kasama na rin ang "balance" sa hash — tingnan ang
        # paliwanag sa Payment.save() (models.py). ─────────────────────
        hash_val = generate_payment_hash(tx_id, member.member_id, loan.loan_id, amount, loan.balance)

        validated_data['tx_id']   = tx_id
        validated_data['hash']    = hash_val
        validated_data['network'] = 'local'  # default, updated after blockchain call

        return super().create(validated_data)
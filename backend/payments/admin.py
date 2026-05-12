from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['tx_id', 'member', 'loan', 'amount', 'balance', 'paid_at']
    search_fields = ['tx_id', 'member__firstname', 'member__lastname']
    ordering      = ['-paid_at']
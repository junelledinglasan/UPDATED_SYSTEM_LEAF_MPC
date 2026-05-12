from django.contrib import admin
from .models import Loan


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display  = ['loan_id', 'member', 'loan_type', 'amount', 'balance', 'status', 'applied_at']
    list_filter   = ['status', 'loan_type']
    search_fields = ['loan_id', 'member__firstname', 'member__lastname']
    ordering      = ['-applied_at']
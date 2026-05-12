from django.urls import path
from .views import (
    overview_view, monthly_collection_view,
    loan_status_view, loan_type_view,
    payment_behavior_view, audit_log_view,
    export_excel_view, export_pdf_view, preview_report_view,
)

urlpatterns = [
    # Analytics
    path('overview/',           overview_view,           name='overview'),
    path('monthly-collection/', monthly_collection_view, name='monthly'),
    path('loan-status/',        loan_status_view,        name='loan-status'),
    path('loan-type/',          loan_type_view,          name='loan-type'),
    path('payment-behavior/',   payment_behavior_view,   name='pay-behavior'),
    path('audit-log/',          audit_log_view,          name='audit-log'),

    # Export
    path('export/excel/',       export_excel_view,       name='export-excel'),
    path('export/pdf/',         export_pdf_view,         name='export-pdf'),
    path('preview/',            preview_report_view,     name='preview'),
]
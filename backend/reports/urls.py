from django.urls import path
from .views import (
    overview_view, monthly_collection_view,
    loan_status_view, loan_type_view,
    payment_behavior_view, audit_log_view,
    export_excel_view, export_pdf_view, preview_report_view,
    # New analytics
    classification_analytics_view,
    member_performance_view,
    top_borrowers_view,
    loan_amount_distribution_view,
    yearly_comparison_view,
    share_capital_growth_view,
    overdue_analysis_view,
    monthly_loans_view,
)

urlpatterns = [
    # Existing analytics
    path('overview/',               overview_view,                  name='overview'),
    path('monthly-collection/',     monthly_collection_view,        name='monthly'),
    path('loan-status/',            loan_status_view,               name='loan-status'),
    path('loan-type/',              loan_type_view,                 name='loan-type'),
    path('payment-behavior/',       payment_behavior_view,          name='pay-behavior'),
    path('audit-log/',              audit_log_view,                 name='audit-log'),

    # New analytics
    path('classification/',         classification_analytics_view,  name='classification'),
    path('member-performance/',     member_performance_view,        name='member-performance'),
    path('top-borrowers/',          top_borrowers_view,             name='top-borrowers'),
    path('loan-distribution/',      loan_amount_distribution_view,  name='loan-distribution'),
    path('yearly-comparison/',      yearly_comparison_view,         name='yearly-comparison'),
    path('share-capital-growth/',   share_capital_growth_view,      name='share-capital'),
    path('overdue-analysis/',       overdue_analysis_view,          name='overdue-analysis'),
    path('monthly-loans/',          monthly_loans_view,             name='monthly-loans'),

    # Export
    path('export/excel/',           export_excel_view,              name='export-excel'),
    path('export/pdf/',             export_pdf_view,                name='export-pdf'),
    path('preview/',                preview_report_view,            name='preview'),
]
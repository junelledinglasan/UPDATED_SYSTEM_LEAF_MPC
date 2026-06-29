from django.urls import path
from .views import (
    overview_view, monthly_collection_view,
    loan_status_view, loan_type_view,
    payment_behavior_view, audit_log_view,
    export_excel_view, export_pdf_view, preview_report_view,
    # Existing analytics
    classification_analytics_view,
    member_performance_view,
    top_borrowers_view,
    loan_amount_distribution_view,
    yearly_comparison_view,
    share_capital_growth_view,
    overdue_analysis_view,
    monthly_loans_view,
    # New analytics
    loan_repayment_progress_view,
    delinquency_report_view,
    collection_efficiency_view,
    member_growth_view,
    loan_approval_rate_view,
    upcoming_maturities_view,
    first_time_borrowers_view,
    risk_assessment_view,
)

urlpatterns = [
    # Core analytics
    path('overview/',               overview_view,                  name='overview'),
    path('monthly-collection/',     monthly_collection_view,        name='monthly'),
    path('loan-status/',            loan_status_view,               name='loan-status'),
    path('loan-type/',              loan_type_view,                 name='loan-type'),
    path('payment-behavior/',       payment_behavior_view,          name='pay-behavior'),
    path('audit-log/',              audit_log_view,                 name='audit-log'),

    # Existing analytics
    path('classification/',         classification_analytics_view,  name='classification'),
    path('member-performance/',     member_performance_view,        name='member-performance'),
    path('top-borrowers/',          top_borrowers_view,             name='top-borrowers'),
    path('loan-distribution/',      loan_amount_distribution_view,  name='loan-distribution'),
    path('yearly-comparison/',      yearly_comparison_view,         name='yearly-comparison'),
    path('share-capital-growth/',   share_capital_growth_view,      name='share-capital'),
    path('overdue-analysis/',       overdue_analysis_view,          name='overdue-analysis'),
    path('monthly-loans/',          monthly_loans_view,             name='monthly-loans'),

    # New analytics
    path('repayment-progress/',     loan_repayment_progress_view,   name='repayment-progress'),
    path('delinquency/',            delinquency_report_view,        name='delinquency'),
    path('collection-efficiency/',  collection_efficiency_view,     name='collection-efficiency'),
    path('member-growth/',          member_growth_view,             name='member-growth'),
    path('approval-rate/',          loan_approval_rate_view,        name='approval-rate'),
    path('upcoming-maturities/',    upcoming_maturities_view,       name='upcoming-maturities'),
    path('first-time-borrowers/',   first_time_borrowers_view,      name='first-time-borrowers'),
    path('risk-assessment/',        risk_assessment_view,           name='risk-assessment'),

    # Export
    path('export/excel/',           export_excel_view,              name='export-excel'),
    path('export/pdf/',             export_pdf_view,                name='export-pdf'),
    path('preview/',                preview_report_view,            name='preview'),
]
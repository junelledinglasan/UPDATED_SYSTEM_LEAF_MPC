from django.urls import path
from .views import (
    payment_list_view,
    payment_stats_view,
    verify_payment_view,
    blockchain_status_view,
    loan_release_detail_view,
    verify_payment_integrity_view,
    verify_loan_release_integrity_view,
)

urlpatterns = [
    path('',                         payment_list_view,      name='payments'),
    path('stats/',                   payment_stats_view,     name='payment-stats'),
    path('verify/<str:tx_hash>/',    verify_payment_view,    name='verify-payment'),
    path('blockchain-status/',       blockchain_status_view, name='blockchain-status'),
    path('loan-release/<int:loan_pk>/', loan_release_detail_view, name='loan-release-detail'),
    # ── BAGO: "Verify Integrity" — DB + on-chain hash comparison para sa
    # Blockchain Audit Log report (Reports tab). Note: "tx_id" (hal.
    # "TX-20260923-001"), IBA sa "verify/<tx_hash>/" sa itaas na Polygon
    # tx HASH (hal. "0x...") ang hinihintay. ──────────────────────────────
    path('verify-integrity/<str:tx_id>/', verify_payment_integrity_view, name='verify-payment-integrity'),
    # ── BAGO: parehong "Verify Integrity" pero para sa LOAN RELEASE
    # (principal/interest/fees breakdown), hindi lang sa isang payment/hulog.
    # Ginagamit sa "My Loans → Loan Details" at sa admin loan release view. ──
    path('verify-release-integrity/<str:tx_id>/', verify_loan_release_integrity_view, name='verify-loan-release-integrity'),
]
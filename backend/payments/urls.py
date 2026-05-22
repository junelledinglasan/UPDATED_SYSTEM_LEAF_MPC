from django.urls import path
from .views import (
    payment_list_view,
    payment_stats_view,
    verify_payment_view,
    blockchain_status_view,
)

urlpatterns = [
    path('',                         payment_list_view,      name='payments'),
    path('stats/',                   payment_stats_view,     name='payment-stats'),
    path('verify/<str:tx_hash>/',    verify_payment_view,    name='verify-payment'),
    path('blockchain-status/',       blockchain_status_view, name='blockchain-status'),
]
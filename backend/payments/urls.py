from django.urls import path
from .views import payment_list_view, payment_stats_view

urlpatterns = [
    path('',       payment_list_view,  name='payment-list'),
    path('stats/', payment_stats_view, name='payment-stats'),
]
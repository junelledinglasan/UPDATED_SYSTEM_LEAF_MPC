from django.urls import path
from .views import (
    loan_list_view, loan_detail_view, due_dates_view,
    gcash_request_list_view, gcash_request_detail_view, gcash_verify_view,
)

urlpatterns = [
    path('',                    loan_list_view,        name='loan-list'),
    path('due-dates/',          due_dates_view,        name='due-dates'),
    path('<int:pk>/',           loan_detail_view,      name='loan-detail'),
    # GCash Payment Requests
    path('gcash-requests/',                gcash_request_list_view,   name='gcash-list'),
    path('gcash-requests/<int:pk>/',       gcash_request_detail_view, name='gcash-detail'),
    path('gcash-requests/<int:pk>/verify/',gcash_verify_view,         name='gcash-verify'),
]
from django.urls import path
from .views import loan_list_view, loan_detail_view, due_dates_view

urlpatterns = [
    path('',             loan_list_view,   name='loan-list'),
    path('due-dates/',   due_dates_view,   name='due-dates'),
    path('<int:pk>/',    loan_detail_view, name='loan-detail'),
]
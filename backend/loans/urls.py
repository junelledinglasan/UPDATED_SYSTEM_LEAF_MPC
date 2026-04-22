from django.urls import path
from .views import loan_list_view, loan_detail_view

urlpatterns = [
    path('',          loan_list_view,   name='loan-list'),
    path('<int:pk>/', loan_detail_view, name='loan-detail'),
]
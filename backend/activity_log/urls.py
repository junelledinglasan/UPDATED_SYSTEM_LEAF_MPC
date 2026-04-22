from django.urls import path
from .views import activity_log_list_view

urlpatterns = [
    path('', activity_log_list_view, name='activity-log'),
]
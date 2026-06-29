# backend/notifications/urls.py

from django.urls import path
from .views import notification_list_view, mark_read_view, mark_all_read_view, unread_count_view

urlpatterns = [
    path('',              notification_list_view, name='notif-list'),
    path('unread-count/', unread_count_view,      name='notif-unread'),
    path('<int:pk>/read/', mark_read_view,         name='notif-read'),
    path('read-all/',      mark_all_read_view,     name='notif-read-all'),
]
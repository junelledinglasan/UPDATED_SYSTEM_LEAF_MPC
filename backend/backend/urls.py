from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/',             admin.site.urls),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # LEAF MPC API
    path('api/auth/',          include('auth_app.urls')),
    path('api/members/',       include('members.urls')),
    path('api/loans/',         include('loans.urls')),
    path('api/payments/',      include('payments.urls')),
    path('api/announcements/', include('announcements.urls')),
    path('api/reports/',       include('reports.urls')),
    path('api/activity-log/',  include('activity_log.urls')),  # ← bagong endpoint
]
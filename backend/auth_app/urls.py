from django.urls import path
from .views import (
    LoginView,
    logout_view,
    me_view,
    staff_list_view,
    staff_detail_view,
    reset_staff_password_view,
)

urlpatterns = [
    path('login/',                         LoginView.as_view(),        name='login'),
    path('logout/',                        logout_view,                name='logout'),
    path('me/',                            me_view,                    name='me'),
    path('staff/',                         staff_list_view,            name='staff-list'),
    path('staff/<int:pk>/',                staff_detail_view,          name='staff-detail'),
    path('staff/<int:pk>/reset-password/', reset_staff_password_view,  name='staff-reset-pw'),
]
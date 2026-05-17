from django.urls import path
from .views import (
    LoginView,
    logout_view,
    me_view,
    register_view,
    update_me_view,
    change_password_view,
    staff_list_view,
    staff_detail_view,
    reset_staff_password_view,
)

urlpatterns = [
    path('login/',                         LoginView.as_view(),        name='login'),
    path('logout/',                        logout_view,                name='logout'),
    path('register/',                      register_view,              name='register'),
    path('me/',                            me_view,                    name='me'),
    path('me/update/',                     update_me_view,             name='me-update'),
    path('change-password/',               change_password_view,       name='change-password'),
    path('staff/',                         staff_list_view,            name='staff-list'),
    path('staff/<int:pk>/',                staff_detail_view,          name='staff-detail'),
    path('staff/<int:pk>/reset-password/', reset_staff_password_view,  name='staff-reset-pw'),
]
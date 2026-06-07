from django.urls import path
from .views import (
    application_list_view, application_detail_view,
    convert_to_member_view, my_application_view,
    member_list_view, member_detail_view,
    member_status_view, member_stats_view, my_profile_view,
    member_financial_summary_view,
    savings_list_view,
    member_savings_summary_view,
)

urlpatterns = [
    # Applications (leaf_members_info)
    path('applications/',                  application_list_view,          name='app-list'),
    path('applications/<int:pk>/',         application_detail_view,        name='app-detail'),
    path('applications/<int:pk>/convert/', convert_to_member_view,         name='app-convert'),
    path('my-application/',                my_application_view,            name='my-application'),

    # Official Members
    path('',                              member_list_view,                name='member-list'),
    path('stats/',                        member_stats_view,               name='member-stats'),
    path('my-profile/',                   my_profile_view,                 name='my-profile'),
    path('<int:pk>/',                     member_detail_view,              name='member-detail'),
    path('<int:pk>/status/',              member_status_view,              name='member-status'),
    path('<int:pk>/financial-summary/',   member_financial_summary_view,   name='member-financial-summary'),

    # Savings
    path('savings/',                      savings_list_view,               name='savings-list'),
    path('<int:pk>/savings-summary/',     member_savings_summary_view,     name='member-savings-summary'),
]
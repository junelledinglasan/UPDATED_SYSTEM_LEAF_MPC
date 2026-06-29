from django.urls import path
from .views import (
    share_capital_deposit_view,
    share_capital_history_view, deactivate_member_view,
    application_list_view, application_detail_view,
    convert_to_member_view, my_application_view,
    member_list_view, member_detail_view,
    member_status_view, member_stats_view, my_profile_view,
    member_financial_summary_view,
    savings_list_view,
    member_savings_summary_view,
    # ── Online Applications (separate table) ──
    online_application_list_view,
    online_application_detail_view,
    convert_online_application_view,
    my_online_application_view,
)

urlpatterns = [
    # Applications (leaf_members_info — F2F)
    path('applications/',                  application_list_view,              name='app-list'),
    path('applications/<int:pk>/',         application_detail_view,            name='app-detail'),
    path('applications/<int:pk>/convert/', convert_to_member_view,             name='app-convert'),
    path('my-application/',                my_application_view,                name='my-application'),

    # Online Applications (online_applications table)
    path('online-applications/',                  online_application_list_view,       name='online-app-list'),
    path('online-applications/<int:pk>/',         online_application_detail_view,     name='online-app-detail'),
    path('online-applications/<int:pk>/convert/', convert_online_application_view,    name='online-app-convert'),
    path('my-online-application/',                my_online_application_view,         name='my-online-application'),

    # Official Members
    path('',                              member_list_view,                    name='member-list'),
    path('stats/',                        member_stats_view,                   name='member-stats'),
    path('my-profile/',                   my_profile_view,                     name='my-profile'),
    path('<int:pk>/',                     member_detail_view,                  name='member-detail'),
    path('<int:pk>/status/',              member_status_view,                  name='member-status'),
    path('<int:pk>/financial-summary/',   member_financial_summary_view,       name='member-financial-summary'),

    # Savings
    path('savings/',                      savings_list_view,                   name='savings-list'),
    path('<int:pk>/savings-summary/',     member_savings_summary_view,         name='member-savings-summary'),

    # Share Capital
    path('<int:pk>/share-capital-deposit/', share_capital_deposit_view,        name='share-capital-deposit'),
    path('share-capital-history/',          share_capital_history_view,         name='share-capital-history'),

    # Deactivate
    path('<int:pk>/deactivate/',            deactivate_member_view,             name='member-deactivate'),

    # Deactivate
    path('<int:pk>/deactivate/',            deactivate_member_view,             name='member-deactivate'),
]
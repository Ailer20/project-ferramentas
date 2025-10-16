from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    re_path(r'^$', TemplateView.as_view(template_name='index.html')),
    re_path(r'^login/$', TemplateView.as_view(template_name='login.html')),
    re_path(r'^register/$', TemplateView.as_view(template_name='register.html')),
    re_path(r'^dashboard/$', TemplateView.as_view(template_name='dashboard.html')),
    re_path(r'^manage-tools/$', TemplateView.as_view(template_name='manage_tools.html')),
    re_path(r'^virtual-warehouse/$', TemplateView.as_view(template_name='virtual_warehouse.html')),
    re_path(r'^register-loan/$', TemplateView.as_view(template_name='register_loan.html')),
    re_path(r'^active-overdue-loans/$', TemplateView.as_view(template_name='active_overdue_loans.html')),
    re_path(r'^history/$', TemplateView.as_view(template_name='history.html')),
    re_path(r'^settings/$', TemplateView.as_view(template_name='settings.html')),
    path("api/", include("inventory.urls")),
    path("api/", include("users.urls")),
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




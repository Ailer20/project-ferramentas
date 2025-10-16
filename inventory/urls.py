from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ToolViewSet, LoanViewSet, DashboardViewSet, ExportViewSet, AnalyticsViewSet

router = DefaultRouter()
router.register(r'tools', ToolViewSet)
router.register(r'loans', LoanViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'export', ExportViewSet, basename='export')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]

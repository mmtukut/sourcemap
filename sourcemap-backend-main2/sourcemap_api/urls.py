from django.urls import path
from . import views
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('health/', views.health_check, name='health-check'),
    path('analyze-file/', views.FileAnalysisView.as_view(), name='file-analysis'),
    path('analysis/<str:document_id>/', views.get_analysis_result, name='get-analysis-result'),
    path('documents/', views.get_user_documents, name='get-user-documents'),

    # Schema URLs
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

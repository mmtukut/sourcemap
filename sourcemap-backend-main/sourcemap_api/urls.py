from django.urls import path
from . import views
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('analysis/', views.FileAnalysisView.as_view(), name='file_analysis'),
    path('analysis/<str:document_id>', views.get_analysis_result, name='get_analysis_result'),
    path('user_documents/', views.get_user_documents, name='get_user_documents'),

    # Schema URLs
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

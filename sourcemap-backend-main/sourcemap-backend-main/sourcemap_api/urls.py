from django.urls import path
from . import views


urlpatterns = [
    # Health check endpoint
    path('health', views.health_check, name='health-check'),
    
    # User file analysis endpoint (combines upload, processing, and analysis)
    path('analyze-file', views.FileAnalysisView.as_view(), name='file-analysis'),
    
    # Bulk upload endpoint (for database population, not user analysis)
    path('bulk-upload', views.BulkUploadView.as_view(), name='bulk-upload'),
    
    # Get analysis results for a document
    path('analysis/<str:document_id>', views.get_analysis_result, name='get-analysis-result'),
]
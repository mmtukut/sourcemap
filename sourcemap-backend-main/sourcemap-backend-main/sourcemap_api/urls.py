from django.urls import path
from .views.document_views import DocumentListView, get_analysis_result
from .views.analysis_views import FileAnalysisView
from .views.upload_views import BulkUploadView
from .views.health_views import health_check


urlpatterns = [
    # Health check endpoint
    path('health', health_check, name='health-check'),

    # Endpoint to get a list of documents for a user
    path('documents/', DocumentListView.as_view(), name='document-list'),

    # User file analysis endpoint (combines upload, processing, and analysis)
    path('analyze-file', FileAnalysisView.as_view(), name='file-analysis'),

    # Bulk upload endpoint (for database population, not user analysis)
    path('bulk-upload', BulkUploadView.as_view(), name='bulk-upload'),

    # Get analysis results for a document
    path('analysis/<str:document_id>', get_analysis_result, name='get-analysis-result'),
]
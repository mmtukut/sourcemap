# Import all views to maintain backward compatibility
from .views.document_views import DocumentListView, get_analysis_result
from .views.analysis_views import FileAnalysisView
from .views.upload_views import BulkUploadView
from .views.health_views import health_check

__all__ = [
    'DocumentListView',
    'get_analysis_result',
    'FileAnalysisView',
    'BulkUploadView',
    'health_check',
]
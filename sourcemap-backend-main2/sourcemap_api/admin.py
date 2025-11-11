from django.contrib import admin
from .models import User, Document, DocumentMetadata, AnalysisResult, AnomalyDetection, KnowledgeDocument, SimilarDocument, AuditLog

# Register your models here.
admin.site.register(User)
admin.site.register(Document)
admin.site.register(DocumentMetadata)
admin.site.register(AnalysisResult)
admin.site.register(AnomalyDetection)
admin.site.register(KnowledgeDocument)
admin.site.register(SimilarDocument)
admin.site.register(AuditLog)

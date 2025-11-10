from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from datetime import datetime
from django.utils import timezone


class User(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    org = models.CharField(max_length=255)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    filename = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    status = models.CharField(max_length=50)  # pending, processing, processed, failed
    extracted_text = models.TextField()
    provenance_hash = models.CharField(max_length=255)  # SHA256 hash
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.filename


class DocumentMetadata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc_id = models.OneToOneField(Document, on_delete=models.CASCADE)
    creation_date = models.DateTimeField(null=True, blank=True)
    author = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Metadata for {self.doc_id.filename}"


class AnalysisResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc_id = models.ForeignKey(Document, on_delete=models.CASCADE)
    confidence_score = models.FloatField()
    sub_scores = models.JSONField()  # JSON for sub-scores
    findings = models.JSONField()  # JSON for findings
    provenance_chain = models.JSONField()  # JSON for model call lineage
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis for {self.doc_id.filename}"


class AnomalyDetection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_id = models.ForeignKey(AnalysisResult, on_delete=models.CASCADE)
    type = models.CharField(max_length=100)
    severity = models.CharField(max_length=50)
    location = models.JSONField()  # JSON for location data
    confidence = models.FloatField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.type} anomaly in analysis {self.analysis_id.id}"


class KnowledgeDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=100)
    source = models.CharField(max_length=255)
    embedding = models.BinaryField()  # Binary field to store embeddings
    doc_metadata = models.JSONField()  # JSON for document metadata
    provenance = models.JSONField()  # JSON for origin/timestamp
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.type} - {self.source}"


class SimilarDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis_id = models.ForeignKey(AnalysisResult, on_delete=models.CASCADE)
    ref_id = models.CharField(max_length=255)  # Reference to similar document
    similarity_score = models.FloatField()
    explanation = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Similar to analysis {self.analysis_id.id}"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    ip = models.GenericIPAddressField()
    data = models.JSONField()  # JSON for action data
    data_lineage = models.JSONField()  # JSON for lineage tracking
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.action} by {self.user_id}"
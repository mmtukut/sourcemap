from rest_framework import serializers
from .models import User, Document, DocumentMetadata, AnalysisResult, AnomalyDetection, KnowledgeDocument, SimilarDocument, AuditLog


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'


class DocumentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMetadata
        fields = '__all__'


class AnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = '__all__'


class AnomalyDetectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyDetection
        fields = '__all__'


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeDocument
        fields = '__all__'


class SimilarDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimilarDocument
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'


# New serializers for API responses
class NewsArticleSerializer(serializers.Serializer):
    title = serializers.CharField(help_text="Title of the news article")
    publisher = serializers.CharField(help_text="Publisher of the news article")
    date = serializers.CharField(help_text="Date of publication")
    link = serializers.CharField(help_text="Link to the news article")
    similarity_score = serializers.FloatField(help_text="Similarity score between 0 and 1")
    description = serializers.CharField(help_text="Description of the news article")


class FileAnalysisResponseSerializer(serializers.Serializer):
    document_id = serializers.CharField(help_text="ID of the processed document")
    filename = serializers.CharField(help_text="Original name of the uploaded file")
    status = serializers.CharField(help_text="Processing status of the document")
    analysis_result = AnalysisResultSerializer(help_text="Analysis result of the document")
    similar_proven_newspapers = serializers.ListField(
        child=NewsArticleSerializer(),
        required=False,
        help_text="List of similar proven newspapers from the newsroom archives"
    )


class DocumentListResponseItemSerializer(serializers.Serializer):
    id = serializers.CharField(help_text="Unique identifier of the document")
    name = serializers.CharField(help_text="Name of the document")
    status = serializers.CharField(help_text="Status of the document (clear, review, flag, etc.)")
    score = serializers.FloatField(help_text="Confidence score of the analysis", allow_null=True)
    date = serializers.CharField(help_text="Date when the document was created")


class HealthCheckResponseSerializer(serializers.Serializer):
    status = serializers.CharField(help_text="System status")
    message = serializers.CharField(help_text="Status message")


class AnalysisResultResponseSerializer(serializers.Serializer):
    document_id = serializers.CharField(help_text="ID of the document")
    status = serializers.CharField(help_text="Processing status of the document")
    analysis_result = AnalysisResultSerializer(required=False, help_text="Analysis result if available")
    similar_proven_newspapers = serializers.ListField(
        child=NewsArticleSerializer(),
        required=False,
        help_text="List of similar proven newspapers from the newsroom archives"
    )
    progress = serializers.IntegerField(required=False, help_text="Processing progress percentage")
    message = serializers.CharField(required=False, help_text="Status message if analysis not completed")
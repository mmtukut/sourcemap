from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .models import User, Document, DocumentMetadata, AnalysisResult, AnomalyDetection, KnowledgeDocument, SimilarDocument, AuditLog
from .serializers import UserSerializer, DocumentSerializer, AnalysisResultSerializer
from django.conf import settings
from .document_processor import process_document_sync
from .vision_analyzer import VisionAnalyzer
from .rag_service import RAGService
from pathlib import Path
import uuid
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import threading
from django.core.paginator import Paginator
from loguru import logger


# Health check view
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint to verify the application is running.
    """
    return Response({"status": "ok", "message": "SourceMap Backend is running"}, status=status.HTTP_200_OK)


# Simplified user analysis endpoint - combines upload, processing, and analysis
@extend_schema(
    description="Upload a file for user analysis. This endpoint handles upload, processing, and analysis synchronously. Returns the analysis results when complete.",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {
                    'type': 'string',
                    'format': 'binary',
                    'description': 'File to be analyzed (PDF, JPG, PNG, etc.)'
                },
                'analysis_type': {
                    'type': 'string',
                    'enum': ['full', 'vision', 'rag'],
                    'default': 'full',
                    'description': 'Type of analysis to perform'
                }
            }
        }
    },
    parameters=[
        OpenApiParameter(
            name='user_email',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Email of the user performing the analysis (required for tracking)'
        )
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        500: OpenApiTypes.OBJECT
    }
)
@method_decorator(csrf_exempt, name='dispatch')
class FileAnalysisView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Upload a file for user analysis.
        This endpoint handles upload, processing, and analysis synchronously.
        Returns the analysis results when complete.
        """
        file_obj = request.FILES.get('file')
        user_email = request.GET.get('user_email', None)
        analysis_type = request.POST.get('analysis_type', 'full')

        if not file_obj:
            return JsonResponse({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not user_email:
            return JsonResponse({'error': 'user_email is a required parameter'}, status=status.HTTP_400_BAD_REQUEST)
        
        if file_obj.content_type not in settings.SUPPORTED_FILE_TYPES:
            return JsonResponse({'error': f'File type {file_obj.content_type} not supported.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if file_obj.size > settings.MAX_FILE_SIZE:
            return JsonResponse({'error': f'File too large. Maximum size is {settings.MAX_FILE_SIZE / (1024*1024):.1f}MB'}, status=status.HTTP_400_BAD_REQUEST)
        
        user, created = User.objects.get_or_create(
            email=user_email,
            defaults={'full_name': 'Firebase User'}
        )
        if not created:
            user.usage_count += 1
            user.save()

        doc_id = str(uuid.uuid4())
        storage_path = Path(settings.STORAGE_PATH)
        storage_path.mkdir(exist_ok=True)
        file_extension = Path(file_obj.name).suffix
        normal_filename = f"{doc_id}{file_extension}"
        file_path = storage_path / normal_filename
        
        path = default_storage.save(str(file_path), ContentFile(file_obj.read()))
        
        try:
            document = Document.objects.create(
                id=doc_id,
                user_id=user,
                filename=file_obj.name,
                storage_path=str(file_path),
                status="pending",
            )
            
            # This is now a fully synchronous process
            self._process_and_analyze_file_sync(str(file_path), doc_id, user.id, analysis_type)
            
            document.refresh_from_db()
            
            # Delegate response generation to the analysis result view logic
            return get_analysis_result(request, document_id)
            
        except Exception as e:
            logger.error(f"Error during file analysis view: {e}", exc_info=True)
            if os.path.exists(str(file_path)):
                os.remove(str(file_path))
            
            return JsonResponse({
                'error': str(e),
                'detail': 'An internal error occurred while saving the document or running analysis.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_and_analyze_file_sync(self, file_path, doc_id, user_id, analysis_type):
        """
        Internal method to process file and perform requested analysis synchronously.
        """
        try:
            process_document_sync(file_path, doc_id, user_id)
            
            document = Document.objects.get(id=doc_id)
            if document.status == "processed":
                if analysis_type in ['full', 'vision']:
                    vision_analyzer = VisionAnalyzer()
                    vision_analyzer.analyze_document(doc_id)
                
                if analysis_type in ['full', 'rag'] and document.extracted_text:
                    rag_service = RAGService()
                    rag_service.analyze_with_context([{"id": doc_id, "text": document.extracted_text}])
                
                logger.success(f"Completed {analysis_type} analysis for document {doc_id}")
            else:
                logger.warning(f"Document {doc_id} was not processed successfully, skipping analysis")
                
        except Exception as e:
            logger.error(f"Error in processing and analysis for document {doc_id}: {str(e)}")
            try:
                document = Document.objects.get(id=doc_id)
                document.status = "failed"
                document.save()
            except Document.DoesNotExist:
                pass


@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_result(request, document_id):
    """
    Get the analysis result for a processed document, including metadata and recommendations.
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        analysis_result = AnalysisResult.objects.filter(doc_id=document).order_by('-created_at').first()
        if analysis_result:
            evidence_items = AnomalyDetection.objects.filter(analysis_id=analysis_result)
            metadata_obj = DocumentMetadata.objects.filter(doc_id=document).first()
            
            # Build the rich response object
            response_data = {
                'document_id': document.id,
                'filename': document.filename,
                'status': document.status,
                'analysis_result': {
                    'id': str(analysis_result.id),
                    'confidence_score': analysis_result.confidence_score,
                    'assessment': analysis_result.findings,
                    'recommendations': analysis_result.recommendations.get('steps', []),
                    'evidence': [
                        {
                            'type': item.type,
                            'description': item.location.get('description', ''),
                            'severity': item.severity,
                            'confidence': item.confidence
                        } for item in evidence_items
                    ],
                    'created_at': analysis_result.created_at.isoformat()
                },
                'metadata': None
            }
            if metadata_obj:
                response_data['metadata'] = {
                    'filename': document.filename,
                    'size_bytes': metadata_obj.size,
                    'type': metadata_obj.file_type,
                    'pages': metadata_obj.page_count,
                    'created': metadata_obj.creation_date.isoformat() if metadata_obj.creation_date else None,
                    'modified': metadata_obj.modified_date.isoformat() if metadata_obj.modified_date else None,
                    'author': metadata_obj.author,
                    'creator_tool': metadata_obj.creator_tool,
                    'producer': metadata_obj.producer,
                }
            
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            status_progress_map = {"pending": 10, "processing": 50, "processed": 100, "failed": 100}
            return Response({
                'document_id': document.id,
                'status': document.status,
                'progress': status_progress_map.get(document.status, 0),
                'message': f'Document is {document.status}, analysis not yet completed'
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error retrieving analysis for doc {document_id}: {e}", exc_info=True)
        return Response({'error': f'Error retrieving analysis: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_documents(request):
    """
    Get a list of documents for a specific user.
    """
    user_email = request.GET.get('user_email', None)
    if not user_email:
        return Response({'error': 'user_email parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=user_email)
        documents = Document.objects.filter(user_id=user).order_by('-created_at')
        
        results = []
        for doc in documents:
            latest_analysis = AnalysisResult.objects.filter(doc_id=doc).order_by('-created_at').first()
            doc_data = {
                'id': doc.id,
                'name': doc.filename,
                'date': doc.created_at.strftime('%b %d, %Y'),
                'status': 'processed',
                'score': None
            }
            if latest_analysis:
                score = latest_analysis.confidence_score
                if score >= 80:
                    doc_data['status'] = 'clear'
                elif score >= 60:
                    doc_data['status'] = 'review'
                else:
                    doc_data['status'] = 'flag'
                doc_data['score'] = score
            else:
                doc_data['status'] = doc.status

            results.append(doc_data)

        return Response(results)

    except User.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

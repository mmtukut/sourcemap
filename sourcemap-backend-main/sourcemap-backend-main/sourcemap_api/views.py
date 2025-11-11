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
            name='user_id',
            type=str,
            location=OpenApiParameter.QUERY,
            description='ID of the user performing the analysis (optional)'
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
        user_id = request.GET.get('user_id', None)
        analysis_type = request.POST.get('analysis_type', 'full')  # 'full', 'vision', 'rag'
        
        if not file_obj:
            return JsonResponse({
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type
        if file_obj.content_type not in settings.SUPPORTED_FILE_TYPES:
            return JsonResponse({
                'error': f'File type {file_obj.content_type} not supported. Supported types: {settings.SUPPORTED_FILE_TYPES}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size
        if file_obj.size > settings.MAX_FILE_SIZE:
            return JsonResponse({
                'error': f'File too large. Maximum size is {settings.MAX_FILE_SIZE / (1024*1024):.1f}MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate document ID
        doc_id = str(uuid.uuid4())
        
        # Create storage directory if it doesn't exist
        storage_path = Path(settings.STORAGE_PATH)
        storage_path.mkdir(exist_ok=True)
        
        # Save file with original extension
        file_extension = Path(file_obj.name).suffix
        normal_filename = f"{doc_id}{file_extension}"
        file_path = storage_path / normal_filename
        
        # Write the uploaded file to storage
        path = default_storage.save(str(file_path), ContentFile(file_obj.read()))
        
        # Create document record in database
        try:
            document = Document.objects.create(
                id=doc_id,
                user_id_id=user_id,  # Assuming user_id is stored directly in the model
                filename=file_obj.name,
                storage_path=str(file_path),
                status="pending",  # Start with pending status
            )
            
            # Process the document synchronously
            self._process_and_analyze_file_sync(str(file_path), doc_id, user_id, analysis_type)
            
            # Get the latest document state from DB
            document.refresh_from_db()
            
            # Get the analysis results if they exist
            analysis_results = AnalysisResult.objects.filter(doc_id=document)
            if analysis_results.exists():
                latest_analysis = analysis_results.latest('created_at')
                return Response({
                    'document_id': doc_id,
                    'filename': file_obj.name,
                    'status': document.status,
                    'analysis_result': {
                        'id': latest_analysis.id,
                        'confidence_score': latest_analysis.confidence_score,
                        'sub_scores': latest_analysis.sub_scores,
                        'findings': latest_analysis.findings,
                        'created_at': latest_analysis.created_at
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'document_id': doc_id,
                    'filename': file_obj.name,
                    'status': document.status,
                    'message': f'Document processed but no analysis completed: {document.status}'
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Clean up the file if DB insertion fails
            if os.path.exists(str(file_path)):
                os.remove(str(file_path))
            
            return JsonResponse({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_and_analyze_file_sync(self, file_path, doc_id, user_id, analysis_type):
        """
        Internal method to process file and perform requested analysis synchronously.
        """
        try:
            # First, process the document for text extraction
            process_document_sync(file_path, doc_id, user_id)
            
            # Get the processed document from the database
            document = Document.objects.get(id=doc_id)
            if document.status == "processed":
                # Now perform the requested analysis
                if analysis_type in ['full', 'vision']:
                    vision_analyzer = VisionAnalyzer()
                    # Run vision analysis
                    vision_result = vision_analyzer.analyze_document(doc_id)
                
                if analysis_type in ['full', 'rag'] and document.extracted_text:
                    rag_service = RAGService()
                    # Run RAG analysis
                    rag_results = rag_service.analyze_with_context([{
                        "id": doc_id,
                        "text": document.extracted_text
                    }])
                
                logger.success(f"Completed {analysis_type} analysis for document {doc_id}")
            else:
                logger.warning(f"Document {doc_id} was not processed successfully, skipping analysis")
                
        except Exception as e:
            logger.error(f"Error in processing and analysis for document {doc_id}: {str(e)}")
            # Update document status to failed if document exists
            try:
                document = Document.objects.get(id=doc_id)
                document.status = "failed"
                document.save()
            except Document.DoesNotExist:
                pass


# Simplified bulk upload endpoint for database population
@extend_schema(
    description="Bulk upload files for database population (not for user analysis). This endpoint processes files and adds them to the knowledge base.",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'files': {
                    'type': 'array',
                    'items': {
                        'type': 'string',
                        'format': 'binary'
                    },
                    'description': 'Multiple files to be processed and added to the knowledge base'
                },
                'doc_type': {
                    'type': 'string',
                    'default': 'general',
                    'description': 'Type of documents being uploaded'
                },
                'source': {
                    'type': 'string',
                    'default': 'bulk_upload',
                    'description': 'Source of the documents'
                }
            }
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        500: OpenApiTypes.OBJECT
    }
)
@method_decorator(csrf_exempt, name='dispatch')
class BulkUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Bulk upload files for database population (not for user analysis).
        This endpoint processes files and adds them to the knowledge base.
        """
        files = request.FILES.getlist('files')
        doc_type = request.POST.get('doc_type', 'general')
        source = request.POST.get('source', 'bulk_upload')
        
        if not files:
            return JsonResponse({
                'error': 'No files provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        doc_ids = []
        
        # Create storage directory if it doesn't exist
        storage_path = Path(settings.STORAGE_PATH)
        storage_path.mkdir(exist_ok=True)
        
        # Validate and process files
        for file in files:
            # Validate file type
            if file.content_type not in settings.SUPPORTED_FILE_TYPES:
                return JsonResponse({
                    'error': f"File type {file.content_type} not supported. Supported types: {settings.SUPPORTED_FILE_TYPES}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size
            if file.size > settings.MAX_FILE_SIZE:
                return JsonResponse({
                    'error': f"File {file.name} too large. Maximum size is {settings.MAX_FILE_SIZE / (1024*1024):.1f}MB"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate document ID
            doc_id = str(uuid.uuid4())
            doc_ids.append(doc_id)
            
            # Save file with original extension
            file_extension = Path(file.name).suffix
            normal_filename = f"{doc_id}{file_extension}"
            file_path = storage_path / normal_filename
            
            # Write the uploaded file to storage
            path = default_storage.save(str(file_path), ContentFile(file.read()))
            
            # Create document record in database
            try:
                document = Document.objects.create(
                    id=doc_id,
                    filename=file.name,
                    storage_path=str(file_path),
                    status="pending",  # Start with pending status
                )
                
                # Process and add to knowledge base synchronously
                self._process_and_add_to_knowledge_base_sync(str(file_path), doc_id, doc_type, source)
                
            except Exception as e:
                # Clean up the file if DB insertion fails
                if os.path.exists(str(file_path)):
                    os.remove(str(file_path))
                return JsonResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': f"Successfully processed {len(files)} documents for knowledge base as type '{doc_type}'",
            'document_count': len(files),
            'document_ids': doc_ids
        }, status=status.HTTP_201_CREATED)
    
    def _process_and_add_to_knowledge_base_sync(self, file_path: str, doc_id: str, doc_type: str, source: str):
        """
        Internal function to process a document and add its content to the knowledge base synchronously.
        """
        # First, process the document using the standard processor
        process_document_sync(file_path, doc_id, None)  # No user_id for bulk uploads
        
        # Then extract the processed text and add to knowledge base
        try:
            # Get the processed document from the database
            document = Document.objects.get(id=doc_id)
            if not document:
                logger.error(f"Document {doc_id} not found after processing")
                return
            
            if document.status != "processed" or not document.extracted_text:
                logger.warning(f"Document {doc_id} not properly processed")
                return
            
            # Add to knowledge base
            rag_service = RAGService()
            rag_service.add_to_knowledge_base(
                [document.extracted_text],  # Add the extracted text to knowledge base
                doc_type,
                source=source
            )
            
            logger.success(f"Successfully added document {doc_id} to knowledge base")
            
        except Document.DoesNotExist:
            logger.error(f"Document {doc_id} does not exist")
        except Exception as e:
            logger.error(f"Error adding document {doc_id} to knowledge base: {str(e)}")


@api_view(['GET'])
@permission_classes([AllowAny])
def get_analysis_result(request, document_id):
    """
    Get the analysis result for a processed document.
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get the analysis results if they exist
    try:
        analysis_results = AnalysisResult.objects.filter(doc_id=document)
        if analysis_results.exists():
            # Return the latest analysis result
            latest_analysis = analysis_results.latest('created_at')
            return Response({
                'document_id': document.id,
                'status': document.status,
                'analysis_result': {
                    'id': latest_analysis.id,
                    'confidence_score': latest_analysis.confidence_score,
                    'sub_scores': latest_analysis.sub_scores,
                    'findings': latest_analysis.findings,
                    'created_at': latest_analysis.created_at
                }
            }, status=status.HTTP_200_OK)
        else:
            # Return document status if no analysis completed yet
            status_progress_map = {
                "pending": 10,
                "processing": 50,
                "processed": 100,
                "failed": 100
            }
            progress = status_progress_map.get(document.status, 0)
            
            return Response({
                'document_id': document.id,
                'status': document.status,
                'progress': progress,
                'message': f'Document is {document.status}, analysis not yet completed'
            }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Error retrieving analysis: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

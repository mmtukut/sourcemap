from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from rest_framework.decorators import permission_classes

from ..models import User, Document, AnalysisResult, SimilarDocument, AuditLog
from ..serializers import FileAnalysisResponseSerializer
from ..document_processor import process_document_sync
from ..vision_analyzer import VisionAnalyzer
from ..rag_service import RAGService
from ..newsroom_service import NewsroomRAGService
from pathlib import Path
import uuid
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import threading
from django.core.paginator import Paginator
from loguru import logger


@extend_schema(
    description="Upload a file for user analysis. This endpoint handles upload, processing, and analysis synchronously. Returns the analysis results when complete. Maximum file size is 20MB. The analysis now includes vision analysis, general RAG comparison, and historical verification against newsroom archives.",
    request={
        'multipart/form-data': {
            'type': 'object',
            'properties': {
                'file': {
                    'type': 'string',
                    'format': 'binary',
                    'description': 'File to be analyzed (PDF, JPG, PNG, etc.). Maximum size: 20MB.'
                },
                'analysis_type': {
                    'type': 'string',
                    'enum': ['full', 'vision', 'rag'],
                    'default': 'full',
                    'description': 'Type of analysis to perform. \'full\' performs all analyses including newsroom RAG, \'vision\' performs only vision analysis, \'rag\' performs general and newsroom RAG analysis.'
                }
            }
        }
    },
    parameters=[
        OpenApiParameter(
            name='user_email',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Email of the user performing the analysis (optional, user will be created if does not exist)'
        )
    ],
    responses={
        200: FileAnalysisResponseSerializer,
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
        The analysis includes vision analysis, general RAG comparison, and historical verification against newsroom archives.
        """
        file_obj = request.FILES.get('file')
        user_email = request.GET.get('user_email', None)
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

        # Handle user lookup/create based on email
        user_obj = None
        if user_email:
            # Look up user by email, create if doesn't exist
            user_obj, created = User.objects.get_or_create(
                email=user_email,
                defaults={
                    'full_name': user_email.split('@')[0],  # Use part before @ as default name
                    'org': 'Unknown'  # Default organization
                }
            )
            user_id = str(user_obj.id)
        else:
            user_id = None

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
                user_id=user_obj,  # Link to user object instead of using user_id directly
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
                
                # Extract similar proven newspapers from provenance_chain (check both old and new field names for backward compatibility)
                similar_proven_newspapers = latest_analysis.provenance_chain.get('similar_proven_newspapers', 
                    latest_analysis.provenance_chain.get('similar_news', []))
                
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
                    },
                    'similar_proven_newspapers': similar_proven_newspapers  # Include similar proven newspapers in the response
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
                vision_result = None
                rag_results = None
                newsroom_results = None
                
                if analysis_type in ['full', 'vision']:
                    vision_analyzer = VisionAnalyzer()
                    # Run vision analysis
                    vision_result = vision_analyzer.analyze_document(doc_id)

                if analysis_type in ['full', 'rag'] and document.extracted_text:
                    rag_service = RAGService()
                    # Run general RAG analysis
                    rag_results = rag_service.analyze_with_context([{
                        "id": doc_id,
                        "text": document.extracted_text
                    }])
                    
                    # Run newsroom RAG analysis for historical verification
                    newsroom_rag_service = NewsroomRAGService()
                    newsroom_results = newsroom_rag_service.analyze_with_newsroom_context([{
                        "id": doc_id,
                        "text": document.extracted_text
                    }])

                # Combine all analysis results to get a comprehensive score
                final_analysis = self._combine_analysis_results(doc_id, vision_result, rag_results, newsroom_results)

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

    def _combine_analysis_results(self, doc_id, vision_result=None, rag_results=None, newsroom_results=None):
        """
        Combine vision analysis, general RAG results, and newsroom RAG results into a final analysis.
        """
        # Get the document to access its extracted text and other properties
        document = Document.objects.get(id=doc_id)
        
        # Initialize default values
        final_confidence_score = 0.0
        final_sub_scores = {}
        final_findings = []
        similar_news_articles = []  # New: store similar news articles
        
        # 1. Process vision analysis results
        if vision_result:
            if hasattr(vision_result, 'confidence_score'):
                vision_score = vision_result.confidence_score
            else:
                # If we have a VisionAnalysis object from the vision analyzer
                vision_score = vision_result.sub_scores.overall_confidence if hasattr(vision_result.sub_scores, 'overall_confidence') else 0.0
            
            final_confidence_score += vision_score * 0.5  # Weight of 50% for vision analysis
            final_sub_scores['vision'] = vision_score
            
            if hasattr(vision_result, 'findings'):
                final_findings.extend(vision_result.findings)
            elif hasattr(vision_result, 'sub_scores') and hasattr(vision_result.sub_scores, 'dict'):
                final_sub_scores.update(vision_result.sub_scores.dict())
        
        # 2. Process general RAG results
        if rag_results:
            # Extract match score from RAG results
            rag_score = 0.0
            if isinstance(rag_results, list) and len(rag_results) > 0:
                first_result = rag_results[0]
                if 'analysis' in first_result and isinstance(first_result['analysis'], dict):
                    rag_score = first_result['analysis'].get('match_score', 0.0)
                elif hasattr(first_result, 'analysis') and hasattr(first_result.analysis, 'match_score'):
                    rag_score = first_result.analysis.match_score
            
            final_confidence_score += rag_score * 0.2  # Weight of 20% for RAG analysis
            final_sub_scores['rag'] = rag_score
            
            if isinstance(rag_results, list) and len(rag_results) > 0:
                first_result = rag_results[0]
                if 'analysis' in first_result and isinstance(first_result['analysis'], dict):
                    if 'findings' in first_result['analysis']:
                        final_findings.extend(first_result['analysis']['findings'])
                    elif 'deviations' in first_result['analysis']:
                        final_findings.extend([f"Deviation: {dev}" for dev in first_result['analysis']['deviations']])

        # 3. Process newsroom RAG results
        if newsroom_results:
            newsroom_score = 0.0
            if isinstance(newsroom_results, list) and len(newsroom_results) > 0:
                first_result = newsroom_results[0]
                newsroom_score = first_result.get('similarity_score', 0.0)
                
                # Extract news articles
                similar_news_articles = first_result.get('similar_news_articles', [])
            
            final_confidence_score += newsroom_score * 0.3  # Weight of 30% for newsroom analysis
            final_sub_scores['newsroom'] = newsroom_score
            
            if isinstance(newsroom_results, list) and len(newsroom_results) > 0:
                first_result = newsroom_results[0]
                if first_result.get('matched_documents_count', 0) > 0:
                    final_findings.append(f"Document matches {first_result['matched_documents_count']} historical records")

        # Ensure the score is within 0-100 range
        final_confidence_score = min(100.0, max(0.0, final_confidence_score))
        
        # Create or update the AnalysisResult in the database
        analysis_result, created = AnalysisResult.objects.get_or_create(
            doc_id=document,
            defaults={
                'confidence_score': final_confidence_score,
                'sub_scores': final_sub_scores,
                'findings': final_findings,
                'provenance_chain': {
                    'model_used': 'combined_analysis',
                    'input_document': doc_id,
                    'components_used': {
                        'vision': vision_result is not None,
                        'rag': rag_results is not None,
                        'newsroom': newsroom_results is not None
                    }
                }
            }
        )
        
        if not created:
            # Update existing record
            analysis_result.confidence_score = final_confidence_score
            analysis_result.sub_scores = final_sub_scores
            analysis_result.findings = final_findings
            analysis_result.provenance_chain = {
                'model_used': 'combined_analysis',
                'input_document': doc_id,
                'components_used': {
                    'vision': vision_result is not None,
                    'rag': rag_results is not None,
                    'newsroom': newsroom_results is not None
                }
            }
            analysis_result.save()

        # Store similar news articles as a separate record or in the analysis result
        # You might want to create a separate model for this or add to the analysis result
        if similar_news_articles:
            # You could store this in a separate model like NewsReference or in a JSON field
            analysis_result.findings.append(f"Found {len(similar_news_articles)} similar news articles")
            
            # Store the news articles in the provenance_chain or as a related model
            analysis_result.provenance_chain['similar_proven_newspapers'] = similar_news_articles
            analysis_result.save()

        return analysis_result
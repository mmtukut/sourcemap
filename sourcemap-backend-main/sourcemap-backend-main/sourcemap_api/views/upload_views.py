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

from ..models import Document, AuditLog
from ..document_processor import process_document_sync
from ..rag_service import RAGService
from pathlib import Path
import uuid
import os
from loguru import logger


@extend_schema(
    description="Bulk upload files for database population (not for user analysis). This endpoint processes files and adds them to the knowledge base and historical archives. Maximum file size is 20MB per file.",
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
                    'description': 'Multiple files to be processed and added to the knowledge base. Maximum size: 20MB per file.'
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
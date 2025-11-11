from typing import Optional
from uuid import uuid4
from datetime import datetime
import hashlib
import base64
from pathlib import Path
import json
import re
import concurrent.futures
from loguru import logger

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader
from pydantic import BaseModel as PydanticBaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from django.conf import settings as django_settings
from django.db import transaction
from .models import Document, DocumentMetadata, AuditLog
from .llm_models import ExtractionResponse


def _get_file_type(file_path: str) -> str:
    """Determine the file type based on extension."""
    path = Path(file_path)
    ext = path.suffix.lower()
    
    if ext == '.pdf':
        return 'application/pdf'
    elif ext in ['.jpg', '.jpeg']:
        return 'image/jpeg'
    elif ext == '.png':
        return 'image/png'
    else:
        return 'application/octet-stream'


def _get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read the file in chunks to handle large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def _extract_metadata(file_path: str) -> dict:
    """
    Extract document metadata using LangChain's PyPDFLoader for PDFs.
    """
    metadata = {
        'creation_date': None,
        'author': None
    }
    
    file_path_obj = Path(file_path)
    
    if file_path_obj.suffix.lower() == '.pdf':
        # Use LangChain's PyPDFLoader to extract PDF metadata
        loader = PyPDFLoader(file_path)
        doc_pages = loader.load()  # Load document pages synchronously
        
        # Extract metadata from the first page if available
        if doc_pages and len(doc_pages) > 0:
            first_page_metadata = doc_pages[0].metadata
            metadata['creation_date'] = first_page_metadata.get('creationDate')
            metadata['author'] = first_page_metadata.get('author')
    
    return metadata


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def _process_with_gemini(file_path: str, file_type: str) -> ExtractionResponse:
    """
    Process document with Gemini 2.5 Pro using multimodal capabilities.
    Retries up to 3 times with exponential backoff in case of failures.
    """
    logger.info(f"Processing document with Gemini: {file_path}")
    
    # Initialize the Gemini model
    llm = ChatGoogleGenerativeAI(
        model=django_settings.GEMINI_MODEL,
        google_api_key=django_settings.GEMINI_API_KEY,
        temperature=0.1  # Consistent output
    )
    
    # Use with_structured_output as per the recommended approach
    # This should work with properly configured langchain-google-genai
    try:
        structured_llm = llm.with_structured_output(ExtractionResponse)
    except (NotImplementedError, TypeError, AttributeError):
        # If structured output is not available or not working, set to None
        structured_llm = None
        logger.warning("Structured output not available, using fallback method")
    
    # Determine how to process the file based on file type
    file_ext = Path(file_path).suffix.lower()
    
    if file_ext in ['.pdf']:
        # For PDF files, process directly using multimodal capabilities
        with open(file_path, "rb") as pdf_file:
            encoded_string = base64.b64encode(pdf_file.read()).decode('utf-8')
            
        message = HumanMessage(
            content=[
                {
                    "type": "text", 
                    "text": (
                        "Extract all text from this PDF document, handling handwriting, "
                        "scans, and unstructured content accurately. "
                        "Preserve structure (e.g., sections, tables). "
                        "Output as clean, joined text with page count estimate. "
                        "Only return the requested fields in the JSON format."
                    )
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:application/pdf;base64,{encoded_string}"
                    }
                }
            ]
        )
    else:
        # For image files, read the content and encode as base64
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        message = HumanMessage(
            content=[
                {
                    "type": "text", 
                    "text": (
                        "Extract all text from this image/document, handling handwriting, "
                        "scans, and unstructured content accurately. "
                        "Preserve structure (e.g., sections, tables). "
                        "Output as clean, joined text with page count estimate. "
                        "Only return the requested fields in the JSON format."
                    )
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{file_type};base64,{encoded_string}"
                    }
                }
            ]
        )

    try:
        # For large files (over 20MB), use Gemini File API instead
        file_size = Path(file_path).stat().st_size
        if file_size > 20 * 1024 * 1024:  # 20MB
            logger.warning(f"File {file_path} is large ({file_size} bytes), consider using Gemini File API")
            # In a real implementation, we'd upload to Gemini's file service for large files
            # For now, we'll proceed with the standard approach
        
        if structured_llm is not None:
            # Process with structured output
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(lambda: structured_llm.invoke([message]))
                result = future.result()
            
            # For PDFs, get actual page count, for images default to 1
            if Path(file_path).suffix.lower() == '.pdf':
                loader = PyPDFLoader(file_path)
                pages = loader.load()
                result.page_count = len(pages)
            
            logger.success(f"Successfully processed document with structured output: {file_path}")
            return result
        else:
            # Fallback: use regular LLM call and parse JSON manually
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(lambda: llm.invoke([message]))
                raw_response = future.result()
            
            # Try to extract structured information from raw response
            response_text = raw_response.content
            # Attempt to parse as JSON if it looks like structured output
            import json
            import re
            
            # Look for JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    json_str = json_match.group()
                    parsed = json.loads(json_str)
                    # Create ExtractionResponse from parsed data
                    # For PDFs, get actual page count, for images default to 1
                    if Path(file_path).suffix.lower() == '.pdf':
                        loader = PyPDFLoader(file_path)
                        pages = loader.load()
                        page_count = len(pages)
                    else:
                        page_count = 1
                        
                    logger.success(f"Successfully processed document with fallback parsing: {file_path}")
                    return ExtractionResponse(
                        extracted_text=parsed.get('extracted_text', response_text),
                        page_count=parsed.get('page_count', page_count),
                        structure_notes=parsed.get('structure_notes', 'Parsed from model response')
                    )
                except json.JSONDecodeError:
                    # JSON parsing failed, use a basic response
                    logger.warning("JSON parsing failed, using basic response fallback")
                    pass
            
            # For PDFs, get actual page count, for images default to 1
            if Path(file_path).suffix.lower() == '.pdf':
                loader = PyPDFLoader(file_path)
                pages = loader.load()
                page_count = len(pages)
            else:
                page_count = 1
            
            # Fallback: return basic response
            logger.success(f"Successfully processed document with basic fallback: {file_path}")
            return ExtractionResponse(
                extracted_text=response_text,
                page_count=page_count,
                structure_notes="Basic text extraction completed"
            )
    except Exception as e:
        logger.error(f"Error processing with Gemini: {str(e)}")
        # Re-raise the exception to trigger retry
        raise e


def process_document_sync(file_path: str, doc_id: str, user_id: Optional[str] = None):
    """
    Synchronous task to process a document using Gemini 2.5 Pro.
    """
    logger.info(f"Starting processing for document {doc_id}")
    
    try:
        # Get the document from the database
        document = Document.objects.filter(id=doc_id).first()
        if not document:
            logger.error(f"Document {doc_id} not found in database")
            return
            
        # Update document status to processing
        document.status = "processing"
        document.save()
        
        # Extract metadata with LangChain's PyPDFLoader
        metadata = _extract_metadata(file_path)
        
        # Save metadata to database
        document_metadata = DocumentMetadata.objects.create(
            doc_id=document,  # Pass the Document object, not just the ID
            creation_date=metadata.get('creation_date'),
            author=metadata.get('author'),
        )
        
        # Determine file type and prepare for Gemini
        file_type = _get_file_type(file_path)
        
        # Process with Gemini 2.5 Pro
        extracted_data = _process_with_gemini(file_path, file_type)
        
        # Update document with extracted text
        document.extracted_text = extracted_data.extracted_text
        document.status = "processed"
        
        # Calculate provenance hash
        text_hash = hashlib.sha256(extracted_data.extracted_text.encode()).hexdigest()
        document.provenance_hash = text_hash
        
        document.save()
        
        # Log to audit
        audit_log = AuditLog.objects.create(
            user_id_id=user_id,
            action="document_processed",
            ip="127.0.0.1",  # Use localhost IP for sync processing
            data={
                "doc_id": doc_id,
                "file_path": file_path,
                "pages_processed": extracted_data.page_count
            },
            data_lineage={
                "input_hash": _get_file_hash(file_path),
                "output_hash": text_hash,
                "model_used": django_settings.GEMINI_MODEL,
                "processing_timestamp": datetime.utcnow().isoformat()
            },
            status="success",
        )
        
        logger.success(f"Completed processing for document {doc_id}")
        
    except Exception as e:
        logger.error(f"Error processing document {doc_id}: {str(e)}")
        # Update document status to failed if document exists
        try:
            document = Document.objects.get(id=doc_id)
            document.status = "failed"
            document.save()
        except Document.DoesNotExist:
            pass
        
        # Log error to audit
        AuditLog.objects.create(
            user_id_id=user_id,
            action="document_processing_failed",
            ip="127.0.0.1",  # Use localhost IP for sync processing
            data={
                "doc_id": doc_id,
                "file_path": file_path,
                "error": str(e)
            },
            data_lineage={
                "input_hash": _get_file_hash(file_path) if 'file_path' in locals() else None,
                "model_used": django_settings.GEMINI_MODEL,
                "processing_timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            },
            status="failed",
        )
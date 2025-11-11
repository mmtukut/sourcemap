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
import fitz  # PyMuPDF
from PIL import Image

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
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
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def _extract_metadata(file_path: str) -> dict:
    """
    Extract comprehensive document metadata using PyMuPDF for PDFs and Pillow for images.
    """
    metadata = {
        'creation_date': None,
        'modified_date': None,
        'author': None,
        'creator_tool': None,
        'producer': None,
        'page_count': 1,
        'size': Path(file_path).stat().st_size,
        'file_type': _get_file_type(file_path),
    }
    
    try:
        path = Path(file_path)
        if path.suffix.lower() == '.pdf':
            doc = fitz.open(file_path)
            doc_meta = doc.metadata
            metadata['page_count'] = doc.page_count
            metadata['author'] = doc_meta.get('author')
            metadata['creator_tool'] = doc_meta.get('creator')
            metadata['producer'] = doc_meta.get('producer')
            
            # Dates can be in various formats, so we try to parse them
            for key in ['creationDate', 'modDate']:
                date_str = doc_meta.get(key)
                if date_str and date_str.startswith("D:"):
                    date_str = date_str[2:].split('Z')[0].split('+')[0].split('-')[0]
                    try:
                        dt = datetime.strptime(date_str, '%Y%m%d%H%M%S')
                        if key == 'creationDate':
                            metadata['creation_date'] = dt
                        else:
                            metadata['modified_date'] = dt
                    except ValueError:
                        pass # Ignore parsing errors
            doc.close()
        elif path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            with Image.open(file_path) as img:
                info = img.info
                # EXIF data for creation time
                if 'exif' in info:
                    exif_data = img._getexif()
                    if exif_data:
                        # 36867 is the tag for DateTimeOriginal
                        creation_time_str = exif_data.get(36867)
                        if creation_time_str:
                             try:
                                 metadata['creation_date'] = datetime.strptime(creation_time_str, '%Y:%m:%d %H:%M:%S')
                             except ValueError:
                                 pass # Ignore parsing errors
    except Exception as e:
        logger.warning(f"Could not extract full metadata from {file_path}: {e}")

    return metadata


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def _process_with_gemini(file_path: str, file_type: str) -> ExtractionResponse:
    """
    Process document with Gemini 2.5 Pro using multimodal capabilities.
    """
    logger.info(f"Processing document with Gemini: {file_path}")
    
    llm = ChatGoogleGenerativeAI(
        model=django_settings.GEMINI_MODEL,
        google_api_key=django_settings.GEMINI_API_KEY,
        temperature=0.1
    )
    structured_llm = llm.with_structured_output(ExtractionResponse)
    
    with open(file_path, "rb") as f:
        encoded_string = base64.b64encode(f.read()).decode('utf-8')
            
    message = HumanMessage(
        content=[
            {
                "type": "text", 
                "text": (
                    "Extract all text from this document, handling handwriting, "
                    "scans, and unstructured content accurately. "
                    "Preserve structure (e.g., sections, tables). "
                    "Output as clean, joined text. Only return the requested fields in the JSON format."
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
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(lambda: structured_llm.invoke([message]))
            result = future.result()
        
        logger.success(f"Successfully processed document with structured output: {file_path}")
        return result
    except Exception as e:
        logger.error(f"Error processing with Gemini: {str(e)}")
        raise e


def process_document_sync(file_path: str, doc_id: str, user_id: Optional[str] = None):
    """
    Synchronous task to process a document using Gemini 2.5 Pro.
    """
    logger.info(f"Starting processing for document {doc_id}")
    
    try:
        document = Document.objects.filter(id=doc_id).first()
        if not document:
            logger.error(f"Document {doc_id} not found in database")
            return
            
        document.status = "processing"
        document.save()
        
        # Comprehensive metadata extraction
        metadata = _extract_metadata(file_path)
        
        # Save metadata to database
        DocumentMetadata.objects.update_or_create(
            doc_id=document,
            defaults={
                'creation_date': metadata.get('creation_date'),
                'modified_date': metadata.get('modified_date'),
                'author': metadata.get('author'),
                'creator_tool': metadata.get('creator_tool'),
                'producer': metadata.get('producer'),
                'page_count': metadata.get('page_count'),
                'size': metadata.get('size'),
                'file_type': metadata.get('file_type'),
            }
        )
        
        file_type = _get_file_type(file_path)
        
        extracted_data = _process_with_gemini(file_path, file_type)
        
        document.extracted_text = extracted_data.extracted_text
        document.status = "processed"
        
        text_hash = hashlib.sha256(extracted_data.extracted_text.encode()).hexdigest()
        document.provenance_hash = text_hash
        document.save()
        
        AuditLog.objects.create(
            user_id_id=user_id,
            action="document_processed",
            ip="127.0.0.1",
            data={
                "doc_id": doc_id,
                "file_path": file_path,
                "pages_processed": metadata.get('page_count')
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
        try:
            document = Document.objects.get(id=doc_id)
            document.status = "failed"
            document.save()
        except Document.DoesNotExist:
            pass
        
        AuditLog.objects.create(
            user_id_id=user_id,
            action="document_processing_failed",
            ip="127.0.0.1",
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

import base64
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

from django.conf import settings as django_settings
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from loguru import logger

from .llm_models import ExtractionResponse
from .models import AuditLog, Document, DocumentMetadata


def _get_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def _process_image(file_path: str) -> ExtractionResponse:
    """Process image files by injecting them directly into the OpenAI API."""
    logger.info(f"Processing image: {file_path}")

    # Initialize the OpenAI model
    llm = ChatOpenAI(
        model=django_settings.OPENAI_MODEL,
        openai_api_key=django_settings.OPENAI_API_KEY,
        temperature=0.1,
    )

    # Create structured LLM
    structured_llm = llm.with_structured_output(ExtractionResponse)

    # Read and encode the image
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

    # Determine image type
    file_ext = Path(file_path).suffix.lower()
    mime_type = "image/jpeg" if file_ext in [".jpg", ".jpeg"] else "image/png"

    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    "Extract all text from this image, handling handwriting, "
                    "scans, and unstructured content accurately. "
                    "Preserve structure (e.g., sections, tables). "
                    "Output as clean, joined text with page count estimate. "
                    "Only return the requested fields in the JSON format."
                ),
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{encoded_string}"},
            },
        ]
    )

    # Process with structured output
    result = structured_llm.invoke([message])
    result.page_count = 1  # For images, default to 1 page

    logger.success(f"Successfully processed image: {file_path}")
    return result


def _process_document(file_path: str) -> ExtractionResponse:
    """Process document files using LangChain loaders."""
    logger.info(f"Processing document: {file_path}")

    # Initialize the OpenAI model
    llm = ChatOpenAI(
        model=django_settings.OPENAI_MODEL,
        openai_api_key=django_settings.OPENAI_API_KEY,
        temperature=0.1,
    )

    # Create structured LLM
    structured_llm = llm.with_structured_output(ExtractionResponse)

    # Determine the file extension
    file_ext = Path(file_path).suffix.lower()

    if file_ext == ".pdf":
        # Use PyPDFLoader for PDF files
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        text_content = " ".join([page.page_content for page in pages])
        page_count = len(pages)
    else:
        # For other document types, raise an error for now
        # You can add more loaders for other formats as needed
        raise ValueError(f"Unsupported document type: {file_ext}")

    # Create prompt with extracted text
    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": (
                    f"Process this document text: {text_content}. "
                    "Extract all text accurately, preserving structure. "
                    "Return clean, joined text with page count estimate. "
                    "Only return the requested fields in the JSON format."
                ),
            }
        ]
    )

    # Process with structured output
    result = structured_llm.invoke([message])
    result.page_count = page_count

    logger.success(f"Successfully processed document: {file_path}")
    return result


def process_document_sync(file_path: str, doc_id: str, user_id: Optional[str] = None):
    """
    Synchronous task to process a document using OpenAI.
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

        # Extract file extension
        file_ext = Path(file_path).suffix.lower()

        # Process based on file type
        if file_ext in [".jpg", ".jpeg", ".png"]:
            # Process image files
            extracted_data = _process_image(file_path)
        elif file_ext in [".pdf"]:
            # Process document files
            extracted_data = _process_document(file_path)
        else:
            logger.error(f"Unsupported file type: {file_ext}")
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Extract PDF metadata if it's a PDF
        if file_ext == ".pdf":
            loader = PyPDFLoader(file_path)
            doc_pages = loader.load()
            if doc_pages and len(doc_pages) > 0:
                first_page_metadata = doc_pages[0].metadata
                metadata = DocumentMetadata.objects.create(
                    doc_id=document,
                    creation_date=first_page_metadata.get("creationDate"),
                    author=first_page_metadata.get("author"),
                )

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
            ip="127.0.0.1",
            data={
                "doc_id": doc_id,
                "file_path": file_path,
                "pages_processed": extracted_data.page_count,
            },
            data_lineage={
                "input_hash": _get_file_hash(file_path),
                "output_hash": text_hash,
                "model_used": django_settings.OPENAI_MODEL,
                "processing_timestamp": datetime.utcnow().isoformat(),
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
            ip="127.0.0.1",
            data={"doc_id": doc_id, "file_path": file_path, "error": str(e)},
            data_lineage={
                "input_hash": _get_file_hash(file_path) if "file_path" in locals() else None,
                "model_used": django_settings.OPENAI_MODEL,
                "processing_timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
            },
            status="failed",
        )

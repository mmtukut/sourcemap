import base64
from typing import Optional, List, Dict, Any
from datetime import datetime
import concurrent.futures
from loguru import logger
import json
import re

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from pydantic import BaseModel as PydanticBaseModel, Field

from django.conf import settings as django_settings
from django.db import transaction
from .models import Document, AnalysisResult, AnomalyDetection

# Enhanced Pydantic model for structured output
class EvidenceItem(PydanticBaseModel):
    """A single piece of evidence found during analysis."""
    type: str = Field(description="The type of evidence, e.g., 'Metadata Anomaly', 'Visual Tampering', 'Content Inconsistency'.")
    description: str = Field(description="A detailed, human-readable description of the evidence found.")
    severity: str = Field(description="The severity of the finding, one of 'critical', 'moderate', or 'consistent'.")
    confidence: float = Field(description="The confidence level (0.0 to 1.0) for this specific piece of evidence.")

class VisionAnalysis(PydanticBaseModel):
    """A structured analysis of a document's authenticity."""
    assessment: str = Field(description="A high-level summary of the overall findings.")
    confidence_score: float = Field(description="A single overall authenticity score from 0.0 to 100.0.")
    evidence: List[EvidenceItem] = Field(description="A list of all evidence items found during the analysis.")


class VisionAnalyzer:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=django_settings.GEMINI_MODEL,
            google_api_key=django_settings.GEMINI_API_KEY,
            temperature=0.1
        )
        try:
            self.structured_llm = self.llm.with_structured_output(VisionAnalysis)
        except (NotImplementedError, TypeError, AttributeError) as e:
            logger.warning(f"Structured output not available, using fallback method. Error: {e}")
            self.structured_llm = None

    def analyze_document(self, doc_id: str) -> Optional[AnalysisResult]:
        """
        Analyze a document using Gemini 2.5 Pro's vision capabilities.
        """
        logger.info(f"Starting vision analysis for document {doc_id}")
        
        try:
            document = Document.objects.filter(id=doc_id).first()
            if not document:
                logger.error(f"Document {doc_id} not found")
                return None

            if document.status != "processed":
                logger.warning(f"Document {doc_id} is not processed yet, status: {document.status}")
                return None

            prompt = (
                "You are a world-class digital forensics expert. Analyze the provided document for any signs of tampering or forgery. "
                "Your analysis must be thorough and meticulous. Examine all aspects: metadata, visual elements (signatures, stamps, layout), and content consistency. "
                "Based on your analysis, provide a structured report including: "
                "1. A high-level assessment summary. "
                "2. A single, overall confidence score of the document's authenticity from 0 to 100. "
                "3. A detailed list of all evidence found. For each piece of evidence, specify its type, a clear description, its severity ('critical', 'moderate', or 'consistent'), and your confidence in the finding (0.0 to 1.0). "
                "Produce ONLY the structured JSON output as defined by the schema."
            )

            from pathlib import Path
            path = Path(document.storage_path)
            ext = path.suffix.lower()
            
            file_type_map = {'.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png'}
            file_type = file_type_map.get(ext, 'application/octet-stream')
            
            with open(document.storage_path, "rb") as file:
                encoded_string = base64.b64encode(file.read()).decode('utf-8')
            
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{file_type};base64,{encoded_string}"}}
                ]
            )

            if self.structured_llm:
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(lambda: self.structured_llm.invoke([message]))
                    result: VisionAnalysis = future.result()
            else:
                raise NotImplementedError("Fallback parsing is not a reliable method for this complex structured output and has been removed.")

            with transaction.atomic():
                analysis_result = AnalysisResult.objects.create(
                    doc_id=document,
                    confidence_score=result.confidence_score,
                    findings=result.assessment, # Store the main assessment here
                    provenance_chain={
                        "model_used": django_settings.GEMINI_MODEL,
                        "analysis_timestamp": datetime.utcnow().isoformat(),
                    },
                )

                for item in result.evidence:
                    AnomalyDetection.objects.create(
                        analysis_id=analysis_result,
                        type=item.type,
                        severity=item.severity.lower(),
                        location={"description": item.description},
                        confidence=item.confidence,
                    )

            logger.success(f"Completed vision analysis for document {doc_id}")
            return analysis_result

        except Exception as e:
            logger.error(f"Error in vision analysis for document {doc_id}: {str(e)}")
            raise e

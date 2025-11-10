import base64
from typing import Optional, List, Dict, Any
from datetime import datetime
import concurrent.futures
from loguru import logger

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader
from pydantic import BaseModel as PydanticBaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from django.conf import settings as django_settings
from django.db import transaction
from .models import Document, AnalysisResult, AnomalyDetection
from .llm_models import VisionAnalysis


class VisionAnalyzer:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=django_settings.GEMINI_MODEL,
            google_api_key=django_settings.GEMINI_API_KEY,
            temperature=0.1
        )
        # Use with_structured_output as per the recommended approach
        # This should work with properly configured langchain-google-genai
        try:
            self.structured_llm = self.llm.with_structured_output(VisionAnalysis)
        except (NotImplementedError, TypeError, AttributeError):
            # If structured output is not available or not working, set to None
            self.structured_llm = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def analyze_document(self, doc_id: str) -> Optional[AnalysisResult]:
        """
        Analyze a document using Gemini 2.5 Pro's vision capabilities.
        Retries up to 3 times with exponential backoff in case of failures.
        """
        logger.info(f"Starting vision analysis for document {doc_id}")
        
        try:
            # Get the document from the database
            document = Document.objects.filter(id=doc_id).first()
            if not document:
                logger.error(f"Document {doc_id} not found")
                return None

            # Skip if document hasn't been processed yet
            if document.status != "processed":
                logger.warning(f"Document {doc_id} is not processed yet, status: {document.status}")
                return None

            # Prepare the analysis prompt
            prompt = (
                "Analyze this document for the following:\n"
                "1. Overall authenticity assessment\n"
                "2. Visual anomalies (watermarks, signatures, formatting issues)\n"
                "3. Layout and structural inconsistencies\n"
                "4. Content authenticity (text matching, image quality, etc.)\n\n"
                "Provide your findings in the structured format required, with specific "
                "details about any potential tampering, inconsistencies, or anomalies detected."
            )

            # Determine file type and read content for multimodal processing
            from pathlib import Path
            path = Path(document.storage_path)
            ext = path.suffix.lower()
            
            if ext == '.pdf':
                file_type = 'application/pdf'
            elif ext in ['.jpg', '.jpeg']:
                file_type = 'image/jpeg'
            elif ext == '.png':
                file_type = 'image/png'
            else:
                file_type = 'application/octet-stream'
            
            with open(document.storage_path, "rb") as file:
                encoded_string = base64.b64encode(file.read()).decode('utf-8')
            
            # Create message with document content
            message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{file_type};base64,{encoded_string}"
                        }
                    }
                ]
            )

            # Perform the vision analysis
            if self.structured_llm is not None:
                # Use structured output
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(lambda: self.structured_llm.invoke([message]))
                    result = future.result()
            else:
                # Fallback: use regular LLM call and parse JSON manually
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(lambda: self.llm.invoke([message]))
                    raw_response = future.result()
                
                # Try to extract structured information from raw response
                response_text = raw_response.content
                import json
                import re
                
                # Look for JSON in the response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    try:
                        json_str = json_match.group()
                        parsed = json.loads(json_str)
                        # Create VisionAnalysis from parsed data
                        result = VisionAnalysis(
                            assessment=parsed.get('assessment', 'Assessment from vision analysis'),
                            sub_scores=parsed.get('sub_scores', {'overall_confidence': 0.5}),
                            findings=parsed.get('findings', ['Analysis performed on document']),
                            evidence=parsed.get('evidence', [{}])
                        )
                    except json.JSONDecodeError:
                        # JSON parsing failed, use basic response
                        result = VisionAnalysis(
                            assessment='Vision analysis completed',
                            sub_scores={'overall_confidence': 0.5},
                            findings=[response_text[:200] + '...' if len(response_text) > 200 else response_text],
                            evidence=[{}]
                        )
                else:
                    # No JSON found, create basic response
                    result = VisionAnalysis(
                        assessment='Vision analysis completed',
                        sub_scores={'overall_confidence': 0.5},
                        findings=[response_text[:200] + '...' if len(response_text) > 200 else response_text],
                        evidence=[{}]
                    )

            # Create AnalysisResult record
            analysis_result = AnalysisResult.objects.create(
                doc_id_id=doc_id,
                confidence_score=result.sub_scores.get('overall_confidence', 0.0),
                sub_scores=result.sub_scores,
                findings=result.findings,
                provenance_chain={
                    "model_used": django_settings.GEMINI_MODEL,
                    "analysis_timestamp": datetime.utcnow().isoformat(),
                    "input_document": doc_id
                },
            )

            # Create AnomalyDetection records for each finding
            for finding in result.findings:
                anomaly = AnomalyDetection.objects.create(
                    analysis_id=analysis_result,  # Pass the AnalysisResult object, not just the ID
                    type="vision_analysis",
                    severity=self._determine_severity(finding),
                    location={},  # Location data would come from the analysis
                    confidence=0.7,  # Default confidence, would come from analysis
                )

            logger.success(f"Completed vision analysis for document {doc_id}")
            return analysis_result

        except Exception as e:
            logger.error(f"Error in vision analysis for document {doc_id}: {str(e)}")
            # Re-raise the exception to trigger retry
            raise e

    def _determine_severity(self, finding: str) -> str:
        """
        Determine the severity of a finding based on keywords.
        """
        high_severity_keywords = ['tampering', 'fraud', 'forgery', 'counterfeit']
        medium_severity_keywords = ['inconsistency', 'anomaly', 'irregularity', 'suspicious']
        
        finding_lower = finding.lower()
        
        if any(keyword in finding_lower for keyword in high_severity_keywords):
            return "high"
        elif any(keyword in finding_lower for keyword in medium_severity_keywords):
            return "medium"
        else:
            return "low"
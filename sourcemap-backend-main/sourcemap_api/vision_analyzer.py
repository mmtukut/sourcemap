import base64
from typing import Optional
from loguru import logger

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from django.conf import settings as django_settings
from .models import Document, AnalysisResult, AnomalyDetection
from .llm_models import VisionAnalysis, EvidenceItem, SubScoreItem


class VisionAnalyzer:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=django_settings.OPENAI_MODEL,
            openai_api_key=django_settings.OPENAI_API_KEY,
            temperature=0.1
        )
        self.structured_llm = self.llm.with_structured_output(VisionAnalysis)

    def analyze_document(self, doc_id: str) -> Optional[AnalysisResult]:
        """
        Analyze a document using OpenAI's vision capabilities.
        """
        logger.info(f"Starting vision analysis for document {doc_id}")

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
            "Analyze this document for authenticity. "
            "Check for visual anomalies, layout inconsistencies, and content authenticity. "
            "Return structured findings about potential tampering or issues."
        )

        # Determine file type
        file_ext = document.storage_path.split('.')[-1].lower()
        mime_type = (
            "image/jpeg" if file_ext in ['jpg', 'jpeg'] 
            else "image/png" if file_ext == 'png'
            else "application/pdf" if file_ext == 'pdf'
            else "application/octet-stream"
        )

        # Read and encode the file
        with open(document.storage_path, "rb") as file:
            encoded_string = base64.b64encode(file.read()).decode('utf-8')

        # Create message with document content
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_string}"}}
            ]
        )

        # Perform the vision analysis
        result = self.structured_llm.invoke([message])

        # Create AnalysisResult record
        analysis_result = AnalysisResult.objects.create(
            doc_id_id=doc_id,
            confidence_score=result.sub_scores.overall_confidence,
            sub_scores=result.sub_scores.dict(),  # Convert to dict for JSON storage
            findings=result.findings,
            provenance_chain={
                "model_used": django_settings.OPENAI_MODEL,
                "input_document": doc_id
            },
        )

        # Create AnomalyDetection records for each finding
        for finding in result.findings:
            anomaly = AnomalyDetection.objects.create(
                analysis_id=analysis_result,
                type="vision_analysis",
                severity=self._determine_severity(finding),
                location={},  # Empty location JSON as default
                confidence=0.7,
            )

        logger.success(f"Completed vision analysis for document {doc_id}")
        return analysis_result

    def _determine_severity(self, finding: str) -> str:
        """
        Determine the severity of a finding based on keywords.
        """
        finding_lower = finding.lower()
        
        if any(keyword in finding_lower for keyword in ['tampering', 'fraud', 'forgery', 'counterfeit']):
            return "high"
        elif any(keyword in finding_lower for keyword in ['inconsistency', 'anomaly', 'irregularity', 'suspicious']):
            return "medium"
        else:
            return "low"
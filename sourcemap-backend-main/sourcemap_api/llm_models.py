from pydantic import BaseModel
from typing import Optional, List


class ExtractionResponse(BaseModel):
    extracted_text: str
    page_count: int
    structure_notes: str


class SubScoreItem(BaseModel):
    overall_confidence: float
    authenticity: Optional[float] = None
    layout: Optional[float] = None
    content: Optional[float] = None
    visual: Optional[float] = None
    signature: Optional[float] = None
    text_quality: Optional[float] = None


class EvidenceItem(BaseModel):
    page_number: Optional[int] = None
    element_type: Optional[str] = None  # e.g., "text", "image", "table", "signature"
    content_snippet: Optional[str] = None
    location_description: Optional[str] = None
    confidence_score: Optional[float] = None


class VisionAnalysis(BaseModel):
    assessment: str
    sub_scores: SubScoreItem
    findings: List[str]
    evidence: List[EvidenceItem]


class RAGAnalysis(BaseModel):
    match_score: float
    deviations: List[str]
    assessment: str
    reasoning: str
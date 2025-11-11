from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ExtractionResponse(BaseModel):
    extracted_text: str
    page_count: int
    structure_notes: str


class VisionAnalysis(BaseModel):
    assessment: str
    sub_scores: Dict[str, float]
    findings: List[str]
    evidence: List[Dict[str, Any]]


class RAGAnalysis(BaseModel):
    match_score: float
    deviations: List[str]
    assessment: str
    reasoning: str
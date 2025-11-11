from typing import List, Optional
from pydantic import BaseModel, Field

class ExtractionResponse(BaseModel):
    """
    Response model for extracting text from a document.
    """
    extracted_text: str = Field(description="The extracted text from the document.")

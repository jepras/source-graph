from pydantic import BaseModel
from typing import Optional


class ResearchRequest(BaseModel):
    item_name: str
    item_type: str  # "song", "movie", "innovation", etc.
    artist: Optional[str] = None


class ResearchResponse(BaseModel):
    item_name: str
    item_type: str
    artist: Optional[str] = None
    influences_text: str
    success: bool
    error_message: Optional[str] = None

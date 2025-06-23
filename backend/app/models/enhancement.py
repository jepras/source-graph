from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import uuid4


class EnhancedContent(BaseModel):
    """Model for enhanced content pieces"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    item_id: str
    content_type: str  # video, audio, text, image
    source: str  # youtube, spotify, wikipedia, etc.
    title: str
    url: str
    thumbnail: Optional[str] = None
    relevance_score: float = Field(ge=0, le=10)
    context_explanation: str
    embedded_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class EnhancementRequest(BaseModel):
    """Request model for item enhancement"""

    item_id: str
    model_name: Optional[str] = None
    max_content_pieces: int = Field(default=4, ge=1, le=10)


class EnhancementResponse(BaseModel):
    """Response model for enhancement results"""

    item_id: str
    analysis: Dict[str, Any]
    enhanced_content: list[EnhancedContent]
    enhancement_summary: str
    error: Optional[str] = None


class EnhancementStatus(BaseModel):
    """Status model for enhancement operations"""

    status: str  # pending, processing, completed, failed
    progress: float = Field(ge=0, le=100)  # percentage
    message: str
    result: Optional[EnhancementResponse] = None

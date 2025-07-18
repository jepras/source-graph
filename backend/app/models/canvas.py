from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.proposal import InfluenceProposal
import time  # ADD this import for canvas agent


class DocumentSection(BaseModel):
    id: str
    type: str  # 'intro' | 'influence-category' | 'influence-item'
    title: Optional[str] = None
    content: str
    influence_data: Optional[InfluenceProposal] = None
    selectedForGraph: bool = True
    isEditing: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None


class CanvasDocument(BaseModel):
    id: str
    item_name: str
    item_type: Optional[str] = None
    item_year: Optional[int] = None  # ADD this line
    creator: Optional[str] = None
    sections: List[DocumentSection]
    created_at: datetime


class CanvasResearchRequest(BaseModel):
    item_name: str
    creator: Optional[str] = None
    item_type: Optional[str] = None
    scope: Optional[str] = "highlights"  # 'highlights' or 'comprehensive'
    selected_model: Optional[str] = (
        None  # 'perplexity', 'perplexity-sonar-reasoning', 'gemini-2.5-flash', 'gemini-2.5-pro', 'openai', or 'default'
    )
    use_two_agent: Optional[bool] = (
        True  # Use two-agent system instead of single-agent - Changed from False to True
    )


class CanvasResearchResponse(BaseModel):
    success: bool
    document: Optional[CanvasDocument] = None
    response_text: Optional[str] = None
    error_message: Optional[str] = None
    active_model: Optional[str] = None  # Model key that was actually used
    active_model_display: Optional[str] = None  # Display name of the model used


class CanvasChatRequest(BaseModel):
    message: str
    current_document: CanvasDocument
    context: Optional[Dict[str, Any]] = None
    selected_model: Optional[str] = (
        None  # 'perplexity', 'perplexity-sonar-reasoning', 'gemini-2.5-flash', 'gemini-2.5-pro', 'openai', or 'default'
    )
    use_two_agent: Optional[bool] = (
        True  # Use two-agent system instead of single-agent - Changed from False to True
    )


class CanvasChatResponse(BaseModel):
    success: bool
    response_text: str
    new_sections: Optional[List[DocumentSection]] = None
    updated_sections: Optional[List[DocumentSection]] = None
    insert_after: Optional[str] = None
    error_message: Optional[str] = None
    active_model: Optional[str] = None  # Model key that was actually used
    active_model_display: Optional[str] = None  # Display name of the model used

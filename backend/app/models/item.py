from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    year: Optional[int] = None
    auto_detected_type: Optional[str] = None  # song/movie/innovation/etc
    confidence_score: Optional[float] = None
    verification_status: str = (
        "ai_generated"  # ai_generated/user_verified/community_verified
    )


class Item(ItemBase):
    id: str
    created_at: Optional[datetime] = None


class Creator(BaseModel):
    id: str
    name: str
    type: str  # person/organization/collective


class InfluenceRelation(BaseModel):
    from_item: Item
    to_item: Item
    confidence: float
    influence_type: str
    explanation: str
    category: str  # Let LLM create freely
    scope: Optional[str] = (
        None  # macro/micro/nano - Optional for backward compatibility
    )
    source: Optional[str] = None
    year_of_influence: Optional[int] = None
    clusters: Optional[List[str]] = None


class GraphResponse(BaseModel):
    main_item: Item
    influences: List[InfluenceRelation]
    categories: List[str]
    creators: List[Creator]
    scopes: Optional[List[str]] = None  # Add available scopes for filtering

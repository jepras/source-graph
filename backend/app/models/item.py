from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ItemBase(BaseModel):
    name: str
    type: str
    year: Optional[int] = None
    description: Optional[str] = None
    artist: Optional[str] = None


class Item(ItemBase):
    id: str
    created_at: Optional[datetime] = None


class InfluenceRelation(BaseModel):
    from_item: Item
    to_item: Item
    confidence: float
    influence_type: str
    source: Optional[str] = None


class GraphResponse(BaseModel):
    main_item: Item
    influences: List[InfluenceRelation]
    categories: List[str]

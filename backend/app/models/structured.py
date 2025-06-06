from pydantic import BaseModel, Field, validator
from typing import List, Optional


class StructuredInfluence(BaseModel):
    name: str = Field(description="Name of the influencing item")
    type: Optional[str] = Field(None, description="Type will be auto-detected by LLM")
    creator_name: Optional[str] = Field(
        None, description="Creator, artist, director, company, etc."
    )
    creator_type: Optional[str] = Field(
        None, description="person/organization/collective"
    )
    year: Optional[int] = Field(None, description="Year of creation")
    category: str = Field(description="Category - LLM creates freely")
    influence_type: str = Field(
        description="How it influenced (sample/technique/inspiration/etc)"
    )
    confidence: float = Field(description="Confidence score 0.0-1.0", ge=0.0, le=1.0)
    explanation: str = Field(description="How this influenced the main item")
    source: Optional[str] = Field(None, description="Source of information")

    @validator("name", pre=True)
    def validate_name(cls, v):
        if v is None:
            raise ValueError("name cannot be None")
        return str(v).strip()

    @validator("creator_name", pre=True)
    def validate_creator_name(cls, v):
        if v is None:
            return None
        return str(v).strip()

    @validator("category", pre=True)
    def validate_category(cls, v):
        if v is None:
            return "Uncategorized"
        return str(v).strip()

    @validator("explanation", pre=True)
    def validate_explanation(cls, v):
        if v is None:
            return "No explanation provided"
        return str(v).strip()


class StructuredOutput(BaseModel):
    main_item: str
    main_item_type: Optional[str] = Field(None, description="Auto-detected by LLM")
    main_item_creator: Optional[str] = Field(None, description="Main creator")
    main_item_creator_type: Optional[str] = Field(
        None, description="person/organization"
    )
    main_item_year: Optional[int] = None
    influences: List[StructuredInfluence]
    categories: List[str]  # All unique categories found


class StructureRequest(BaseModel):
    influences_text: str = Field(description="Free text about influences to structure")
    main_item: str = Field(description="The main item name")
    main_item_creator: Optional[str] = Field(
        None, description="The main item creator (optional)"
    )

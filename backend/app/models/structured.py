from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class InfluenceType(str, Enum):
    AUDIO_SAMPLE = "audio_sample"
    LITERARY_TECHNIQUE = "literary_technique"
    PERSONAL_EXPERIENCE = "personal_experience"
    CINEMATIC_INFLUENCE = "cinematic_influence"
    MUSICAL_TECHNIQUE = "musical_technique"
    CULTURAL_CONTEXT = "cultural_context"
    TECHNOLOGICAL = "technological"
    OTHER = "other"


class StructuredInfluence(BaseModel):
    name: str = Field(description="Name of the influencing item")
    type: str = Field(
        description="Type of item: song, movie, book, person, technique, etc."
    )
    artist_creator: Optional[str] = Field(
        None, description="Artist, author, director, or creator"
    )
    year: Optional[int] = Field(None, description="Year of creation or influence")
    category: str = Field(
        description="Category like 'Audio Samples', 'Literary Techniques', etc."
    )
    influence_type: InfluenceType = Field(description="Type of influence relationship")
    confidence: float = Field(description="Confidence score 0.0-1.0", ge=0.0, le=1.0)
    explanation: str = Field(
        description="Brief explanation of how this influenced the main item"
    )
    source: Optional[str] = Field(None, description="Source of this information")


class StructuredOutput(BaseModel):
    main_item: str = Field(description="The item being analyzed")
    main_item_type: str = Field(description="Type of the main item")
    main_item_artist: Optional[str] = Field(
        None, description="Artist/creator of main item"
    )
    main_item_year: Optional[int] = Field(None, description="Year of main item")
    influences: List[StructuredInfluence] = Field(
        description="List of structured influences"
    )
    categories: List[str] = Field(description="List of unique categories found")


class StructureRequest(BaseModel):
    influences_text: str = Field(description="Free text about influences to structure")
    main_item: str = Field(description="The main item name")
    main_item_type: str = Field(description="The main item type")
    main_item_artist: Optional[str] = Field(
        None, description="The main item artist/creator"
    )

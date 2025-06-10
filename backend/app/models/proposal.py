from pydantic import BaseModel, Field
from typing import List, Optional


class InfluenceProposal(BaseModel):
    """Single influence proposal from AI"""

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
    scope: str = Field(description="macro/micro/nano scope level")
    influence_type: str = Field(
        description="How it influenced (sample/technique/inspiration/etc)"
    )
    confidence: float = Field(description="Confidence score 0.0-1.0", ge=0.0, le=1.0)
    explanation: str = Field(description="How this influenced the main item")
    source: Optional[str] = Field(None, description="Source of information")
    accepted: bool = Field(
        default=False, description="Whether user accepted this proposal"
    )

    parent_id: Optional[str] = (
        None  # ID of parent influence if this is a specific breakdown
    )
    children: List["InfluenceProposal"] = []  # Child influences (specifics)
    is_expanded: bool = False  # UI state for nested display

    def add_child(self, child_proposal: "InfluenceProposal"):
        """Add a child (specific) influence to this proposal"""
        child_proposal.parent_id = self.id
        self.children.append(child_proposal)
        self.is_expanded = True


# Update forward references
InfluenceProposal.model_rebuild()


class ProposalRequest(BaseModel):
    """Request for influence proposals"""

    item_name: str = Field(description="Name of item to research")
    item_type: Optional[str] = Field(None, description="Type of item (song/movie/etc)")
    artist: Optional[str] = Field(None, description="Creator of the item")
    context: Optional[str] = Field(
        None, description="Additional context about the item"
    )


class ProposalResponse(BaseModel):
    """Response containing organized influence proposals"""

    item_name: str
    item_type: Optional[str]
    artist: Optional[str]
    item_description: Optional[str] = None  # NEW: Add this line
    item_year: Optional[int] = None  # NEW: Add this line
    macro_influences: List[InfluenceProposal] = Field(
        description="Major foundational influences"
    )
    micro_influences: List[InfluenceProposal] = Field(
        description="Specific techniques and elements"
    )
    nano_influences: List[InfluenceProposal] = Field(
        description="Tiny details and specifics"
    )
    all_categories: List[str] = Field(
        description="All categories found across proposals"
    )
    total_proposals: int = Field(description="Total number of proposals")
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(None)


class MoreProposalsRequest(BaseModel):
    """Request for more proposals in specific category/scope"""

    item_name: str
    item_type: Optional[str] = None
    artist: Optional[str] = None
    scope: str = Field(description="macro/micro/nano")
    category: str = Field(description="Category to get more influences in")
    count: int = Field(
        default=3, description="Number of additional proposals", ge=1, le=10
    )
    existing_influences: List[str] = Field(
        default=[], description="Names of influences already proposed"
    )


class AcceptProposalsRequest(BaseModel):
    """Request to save accepted proposals to database"""

    item_name: str
    item_type: Optional[str] = None
    artist: Optional[str] = None
    item_year: Optional[int] = None
    item_description: Optional[str] = None  # Make sure this line exists
    accepted_proposals: List[InfluenceProposal]

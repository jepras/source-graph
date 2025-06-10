from fastapi import APIRouter, HTTPException
from typing import List  # Add this line
from app.models.ai import ResearchRequest, ResearchResponse
from app.models.structured import StructureRequest, StructuredOutput
from app.services.ai_agents.research_agent import research_agent
from app.services.ai_agents.structure_agent import structure_agent
from app.models.proposal import (
    ProposalRequest,
    ProposalResponse,
    MoreProposalsRequest,
    AcceptProposalsRequest,
    InfluenceProposal,
)
from app.services.ai_agents.proposal_agent import proposal_agent
from app.services.graph.graph_service import graph_service
from app.models.structured import StructuredOutput, StructuredInfluence

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/research", response_model=ResearchResponse)
async def research_influences(request: ResearchRequest):
    """Research influences for an item using AI"""
    try:
        # Call the research agent
        influences_text = await research_agent.research_influences(
            item_name=request.item_name,
            item_type=request.item_type,
            artist=request.artist,
        )

        # Check if there was an error
        if influences_text.startswith("Error researching influences:"):
            return ResearchResponse(
                item_name=request.item_name,
                item_type=request.item_type,
                artist=request.artist,
                influences_text="",
                success=False,
                error_message=influences_text,
            )

        return ResearchResponse(
            item_name=request.item_name,
            item_type=request.item_type,
            artist=request.artist,
            influences_text=influences_text,
            success=True,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to research influences: {str(e)}"
        )


@router.post("/structure", response_model=StructuredOutput)
async def structure_influences(request: StructureRequest):
    """Convert free text influences into structured data"""
    try:
        structured_data = await structure_agent.structure_influences(
            influences_text=request.influences_text,
            main_item=request.main_item,
            main_item_creator=request.main_item_creator,
        )

        return structured_data

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to structure influences: {str(e)}"
        )


@router.get("/health")
async def ai_health_check():
    """Check if AI services are working"""
    try:
        # Simple test call
        test_response = await research_agent.research_influences(
            item_name="Test Song", item_type="song", artist="Test Artist"
        )

        return {
            "status": "healthy",
            "ai_service": "operational",
            "test_response_length": len(test_response),
        }
    except Exception as e:
        return {"status": "unhealthy", "ai_service": "error", "error": str(e)}


@router.post("/propose", response_model=ProposalResponse)
async def propose_influences(request: ProposalRequest):
    """Get AI proposals for influences across macro/micro/nano levels"""
    try:
        proposals = await proposal_agent.propose_influences(
            item_name=request.item_name,
            item_type=request.item_type,
            artist=request.artist,
            context=request.context,
        )
        return proposals

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate proposals: {str(e)}"
        )


@router.post("/propose/more")
async def get_more_proposals(request: MoreProposalsRequest):
    """Get more proposals in specific category and scope"""
    try:
        additional_proposals = await proposal_agent.get_more_proposals(request)

        return {
            "item_name": request.item_name,
            "scope": request.scope,
            "category": request.category,
            "proposals": additional_proposals,
            "count": len(additional_proposals),
            "success": True,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get additional proposals: {str(e)}"
        )


@router.post("/proposals/accept")
async def accept_proposals(request: AcceptProposalsRequest):
    """Save accepted proposals to the database"""
    try:
        print(f"=== ACCEPT PROPOSALS DEBUG ===")
        print(f"Request item_name: {request.item_name}")
        print(f"Request item_year: {request.item_year}")
        print(
            f"Request item_description: {getattr(request, 'item_description', 'FIELD_MISSING')}"
        )
        print(f"Request item_type: {request.item_type}")
        print(f"Request artist: {request.artist}")

        if not request.accepted_proposals:
            raise HTTPException(
                status_code=400, detail="No proposals provided to accept"
            )

        # Convert proposals to structured format for database saving
        structured_influences = []

        for proposal in request.accepted_proposals:
            structured_influence = StructuredInfluence(
                name=proposal.name,
                type=proposal.type,
                creator_name=proposal.creator_name,
                creator_type=proposal.creator_type,
                year=proposal.year,
                category=proposal.category,
                scope=proposal.scope,  # Include scope in structured data
                influence_type=proposal.influence_type,
                confidence=proposal.confidence,
                explanation=proposal.explanation,
                source=proposal.source,
            )
            structured_influences.append(structured_influence)

        # Create structured output
        structured_data = StructuredOutput(
            main_item=request.item_name,
            main_item_type=request.item_type,
            main_item_creator=request.artist,
            main_item_creator_type="person" if request.artist else None,
            main_item_year=request.item_year,
            main_item_description=request.item_description,  # ADD this line
            influences=structured_influences,
            categories=list(set([inf.category for inf in structured_influences])),
        )

        print(f"=== STRUCTURED DATA CREATED ===")
        print(f"structured_data.main_item_year: {structured_data.main_item_year}")
        print(
            f"structured_data.main_item_description: {structured_data.main_item_description}"
        )

        # Save to database using existing graph service
        item_id = graph_service.save_structured_influences(structured_data)

        return {
            "success": True,
            "item_id": item_id,
            "accepted_count": len(request.accepted_proposals),
            "message": f"Successfully saved {len(request.accepted_proposals)} influences",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save proposals: {str(e)}"
        )


@router.get("/proposals/test/{item_name}")
async def test_proposals(item_name: str, artist: str = None, item_type: str = None):
    """Test endpoint for proposal generation"""
    try:
        proposals = await proposal_agent.propose_influences(
            item_name=item_name, item_type=item_type, artist=artist
        )

        return {
            "test_item": item_name,
            "proposals_generated": proposals.total_proposals,
            "macro_count": len(proposals.macro_influences),
            "micro_count": len(proposals.micro_influences),
            "nano_count": len(proposals.nano_influences),
            "categories": proposals.all_categories,
            "success": proposals.success,
            "sample_macro": (
                proposals.macro_influences[0].name
                if proposals.macro_influences
                else None
            ),
            "sample_micro": (
                proposals.micro_influences[0].name
                if proposals.micro_influences
                else None
            ),
            "sample_nano": (
                proposals.nano_influences[0].name if proposals.nano_influences else None
            ),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.post("/specifics", response_model=List[InfluenceProposal])
async def get_influence_specifics(request: dict):
    """Get specific nano-level influences for a given influence proposal"""
    try:
        # Extract the influence details from request
        influence_name = request.get("influence_name")
        influence_explanation = request.get("influence_explanation")
        main_item_name = request.get("main_item_name")
        main_item_artist = request.get("main_item_artist", "")

        if not all([influence_name, influence_explanation, main_item_name]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: influence_name, influence_explanation, main_item_name",
            )

        # Generate specific influences using the proposal agent
        specifics = await proposal_agent.get_influence_specifics(
            influence_name=influence_name,
            influence_explanation=influence_explanation,
            main_item_name=main_item_name,
            main_item_artist=main_item_artist,
        )

        return specifics

    except Exception as e:
        print(f"Error getting influence specifics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

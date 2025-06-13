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
    UnifiedQuestionRequest,
    UnifiedQuestionResponse,
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
    """Accept selected proposals with conflict resolution"""
    try:
        # Convert proposals back to StructuredOutput format
        structured_data = StructuredOutput(
            main_item=request.item_name,
            main_item_type=request.item_type,
            main_item_creator=request.artist,  # Map artist back to creator
            main_item_creator_type="person",  # Default
            main_item_year=request.item_year,
            main_item_description=request.item_description,
            influences=[
                StructuredInfluence(
                    name=proposal.name,
                    type=proposal.type,
                    creator_name=proposal.creator_name,
                    creator_type=proposal.creator_type,
                    year=proposal.year,
                    category=proposal.category,
                    scope=proposal.scope,  # Important: include scope
                    influence_type=proposal.influence_type,
                    confidence=proposal.confidence,
                    explanation=proposal.explanation,
                    source=proposal.source,
                    clusters=proposal.clusters,  # ADD THIS LINE
                )
                for proposal in request.accepted_proposals
                if proposal.accepted
            ],
            categories=list(
                set([p.category for p in request.accepted_proposals if p.accepted])
            ),
        )

        # Use the existing conflict resolution logic
        similar_items = graph_service.find_similar_items(
            name=structured_data.main_item,
            creator_name=structured_data.main_item_creator,
        )

        if similar_items:
            return {
                "success": False,
                "requires_review": True,
                "similar_items": similar_items,
                "new_data": structured_data.dict(),
                "message": f"Found {len(similar_items)} potentially similar item(s). Please review before proceeding.",
            }

        # No conflicts, save normally
        main_item_id = graph_service.save_structured_influences(structured_data)

        return {
            "success": True,
            "item_id": main_item_id,
            "accepted_count": len(
                [p for p in request.accepted_proposals if p.accepted]
            ),
            "message": f"Successfully saved {len([p for p in request.accepted_proposals if p.accepted])} influences",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to accept proposals: {str(e)}"
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


@router.post("/question", response_model=UnifiedQuestionResponse)
async def ask_question(request: UnifiedQuestionRequest):
    """Unified endpoint for asking any question about items or influences"""
    try:
        print(f"=== UNIFIED QUESTION API DEBUG ===")
        print(f"Item: {request.item_name}")
        print(f"Question: {request.question}")
        print(f"Target influence: {request.target_influence_name}")
        print(f"=== END DEBUG ===")

        response = await proposal_agent.answer_question(
            item_name=request.item_name,
            question=request.question,
            item_type=request.item_type,
            artist=request.artist,
            item_year=request.item_year,
            item_description=request.item_description,
            target_influence_name=request.target_influence_name,
            target_influence_explanation=request.target_influence_explanation,
        )

        return response

    except Exception as e:
        print(f"Error in ask_question: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to process question: {str(e)}"
        )

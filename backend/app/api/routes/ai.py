from fastapi import APIRouter, HTTPException
from typing import List  # Add this line
from app.models.structured import StructureRequest, StructuredOutput
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


@router.post("/propose", response_model=ProposalResponse)
async def propose_influences(request: ProposalRequest):
    """Get AI proposals for influences across macro/micro/nano levels"""
    try:
        proposals = await proposal_agent.propose_influences(
            item_name=request.item_name,
            item_type=request.item_type,
            creator=request.creator,
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
    """Accept selected proposals with comprehensive conflict resolution"""
    try:
        # Convert proposals back to StructuredOutput format
        structured_data = StructuredOutput(
            main_item=request.item_name,
            main_item_type=request.item_type,
            main_item_creator=request.creator,  # Map creator back to creator
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

        # Use comprehensive conflict detection
        conflicts = graph_service.find_comprehensive_conflicts(structured_data)

        if conflicts["total_conflicts"] > 0:
            # Get comprehensive preview data
            preview_data = graph_service.get_comprehensive_preview(conflicts)

            return {
                "success": False,
                "requires_review": True,
                "conflicts": conflicts,
                "preview_data": preview_data,
                "new_data": structured_data.dict(),
                "message": f"Found {conflicts['total_conflicts']} potential conflicts. Please review before proceeding.",
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
async def test_proposals(item_name: str, creator: str = None, item_type: str = None):
    """Test endpoint for proposal generation"""
    try:
        proposals = await proposal_agent.propose_influences(
            item_name=item_name, item_type=item_type, creator=creator
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
        response = await proposal_agent.answer_question(
            item_name=request.item_name,
            question=request.question,
            item_type=request.item_type,
            creator=request.creator,
            item_year=request.item_year,
            item_description=request.item_description,
            target_influence_name=request.target_influence_name,
            target_influence_explanation=request.target_influence_explanation,
        )

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process question: {str(e)}"
        )

import pytest
import json
from app.services.ai_agents.proposal_agent import proposal_agent
from app.models.proposal import InfluenceProposal, ProposalResponse


class TestProposalAgent:
    """Test AI agent response parsing and data structure validation"""

    @pytest.mark.asyncio
    async def test_proposal_response_structure_song(self, sample_test_items):
        """Test AI generates valid InfluenceProposal objects for songs"""
        song = sample_test_items["songs"][0]

        response = await proposal_agent.propose_influences(
            item_name=song["name"], item_type=song["type"], creator=song["creator"]
        )

        # Basic response validation
        assert isinstance(response, ProposalResponse)
        assert response.item_name == song["name"]
        assert response.success is True
        assert response.total_proposals > 0

        # Validate we have proposals in each scope
        assert len(response.macro_influences) > 0
        assert len(response.micro_influences) > 0
        assert len(response.nano_influences) > 0

        # Test each proposal has required fields
        all_proposals = (
            response.macro_influences
            + response.micro_influences
            + response.nano_influences
        )

        for proposal in all_proposals:
            assert isinstance(proposal, InfluenceProposal)
            assert proposal.name is not None and proposal.name.strip() != ""
            assert proposal.category is not None and proposal.category.strip() != ""
            assert proposal.scope in ["macro", "micro", "nano"]
            assert 0.0 <= proposal.confidence <= 1.0
            assert (
                proposal.explanation is not None and proposal.explanation.strip() != ""
            )

            # Year validation - if year exists, should be reasonable
            if proposal.year:
                assert 1800 <= proposal.year <= 2025

    @pytest.mark.asyncio
    async def test_proposal_response_structure_movie(self, sample_test_items):
        """Test AI generates valid proposals for movies"""
        movie = sample_test_items["movies"][0]

        response = await proposal_agent.propose_influences(
            item_name=movie["name"], item_type=movie["type"], creator=movie["creator"]
        )

        assert response.success is True
        assert response.item_name == movie["name"]

        # Movies should have different influence patterns than songs
        all_proposals = (
            response.macro_influences
            + response.micro_influences
            + response.nano_influences
        )

        # Verify at least some proposals have creators
        proposals_with_creators = [p for p in all_proposals if p.creator_name]
        assert len(proposals_with_creators) > 0

    @pytest.mark.asyncio
    async def test_chronological_logic(self, sample_test_items):
        """Test that influences predate the main item when years are available"""
        song = sample_test_items["songs"][0]

        response = await proposal_agent.propose_influences(
            item_name=song["name"], item_type=song["type"], creator=song["creator"]
        )

        # Get main item year from response
        main_item_year = response.item_year

        if main_item_year:
            all_proposals = (
                response.macro_influences
                + response.micro_influences
                + response.nano_influences
            )

            for proposal in all_proposals:
                if proposal.year:
                    assert proposal.year <= main_item_year, (
                        f"Influence '{proposal.name}' ({proposal.year}) "
                        f"cannot be after main item ({main_item_year})"
                    )

    @pytest.mark.asyncio
    async def test_edge_case_item_names(self):
        """Test AI handles edge case item names gracefully"""
        edge_cases = [
            {"name": "Song with 'quotes' and (parentheses)", "creator": "Test Artist"},
            {"name": "Song-with-dashes-and_underscores", "creator": "Test Artist"},
            {"name": "Song with números and émojis 🎵", "creator": "Test Artist"},
        ]

        for case in edge_cases:
            response = await proposal_agent.propose_influences(
                item_name=case["name"], creator=case["creator"]
            )

            # Should not crash and should return some proposals
            assert response.success is True
            assert response.total_proposals > 0

    @pytest.mark.asyncio
    async def test_confidence_score_distribution(self, sample_test_items):
        """Test that confidence scores are distributed reasonably"""
        song = sample_test_items["songs"][0]

        response = await proposal_agent.propose_influences(
            item_name=song["name"], item_type=song["type"], creator=song["creator"]
        )

        all_proposals = (
            response.macro_influences
            + response.micro_influences
            + response.nano_influences
        )

        confidences = [p.confidence for p in all_proposals]

        # Should have a reasonable distribution, not all the same
        assert len(set(confidences)) > 1, "All confidence scores are identical"

        # Most should be in reasonable range (not too low)
        reasonable_confidences = [c for c in confidences if c >= 0.5]
        assert (
            len(reasonable_confidences) >= len(confidences) * 0.7
        ), "Too many low-confidence proposals"

    @pytest.mark.asyncio
    async def test_category_generation(self, sample_test_items):
        """Test that AI generates meaningful categories"""
        song = sample_test_items["songs"][0]

        response = await proposal_agent.propose_influences(
            item_name=song["name"], item_type=song["type"], creator=song["creator"]
        )

        # Should have multiple categories
        assert len(response.all_categories) >= 2

        # Categories should not be empty or generic
        for category in response.all_categories:
            assert category.strip() != ""
            assert category.lower() not in ["influence", "other", "misc", "general"]

    @pytest.mark.asyncio
    async def test_scope_distribution(self, sample_test_items):
        """Test that proposals are distributed across macro/micro/nano scopes"""
        song = sample_test_items["songs"][0]

        response = await proposal_agent.propose_influences(
            item_name=song["name"], item_type=song["type"], creator=song["creator"]
        )

        # Should have proposals in each scope level
        assert len(response.macro_influences) >= 1
        assert len(response.micro_influences) >= 1
        assert len(response.nano_influences) >= 1

        # Macro influences should generally be broader/older
        # Nano influences should be more specific
        macro_explanations = [p.explanation for p in response.macro_influences]
        nano_explanations = [p.explanation for p in response.nano_influences]

        # This is a heuristic - macro explanations often mention broader terms
        broad_terms = ["genre", "movement", "style", "tradition", "era"]
        specific_terms = ["technique", "sound", "sample", "lyric", "beat"]

        macro_has_broad = any(
            any(term in exp.lower() for term in broad_terms)
            for exp in macro_explanations
        )
        nano_has_specific = any(
            any(term in exp.lower() for term in specific_terms)
            for exp in nano_explanations
        )

        # At least some should follow this pattern
        assert (
            macro_has_broad or nano_has_specific
        ), "Scope levels don't seem to reflect broad vs specific influences"

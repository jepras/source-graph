import { useCallback } from 'react';
import { proposalApi, api } from '../services/api';
import { useResearch } from '../contexts/ResearchContext';
import { useGraph } from '../contexts/GraphContext';
import type { 
  AcceptProposalsRequest, 
  AcceptProposalsResponse,
  UnifiedQuestionRequest
} from '../services/api';

export const useProposals = () => {
  const { state, dispatch } = useResearch();
  const { addNodesAndLinks } = useGraph();

  // Used in ProposalForm
  const generateProposals = useCallback(async () => {
    if (!state.itemName.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter an item name' });
      return;
    }

    dispatch({ type: 'SET_PROPOSAL_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_PROPOSALS', payload: null });
    dispatch({ type: 'SET_SELECTED_PROPOSALS', payload: new Set() });
    
    // Clear all question responses from previous research session
    dispatch({ type: 'SET_MAIN_ITEM_QUESTION_RESPONSE', payload: null });
    dispatch({ type: 'SET_MAIN_ITEM_QUESTION_TEXT', payload: '' });
    
    // Clear all influence question responses
    Object.keys(state.influenceQuestionResponses).forEach(key => {
      dispatch({ type: 'REMOVE_INFLUENCE_QUESTION_RESPONSE', payload: key });
    });
    
    // Clear all influence question inputs
    Object.keys(state.influenceQuestions).forEach(key => {
      dispatch({ type: 'SET_INFLUENCE_QUESTION', payload: { key, value: '' } });
    });
    
    // Clear expanded proposals (specifics)
    Object.keys(state.expandedProposals).forEach(key => {
      dispatch({ type: 'SET_EXPANDED_PROPOSALS', payload: { key, proposals: null } });
    });

    try {
      const proposalResponse = await proposalApi.generateProposals({
        item_name: state.itemName.trim(),
        creator: state.creator.trim() || undefined,
        item_type: undefined // Let AI auto-detect
      });

      if (proposalResponse.success) {
        dispatch({ type: 'SET_PROPOSALS', payload: proposalResponse });
      } else {
        dispatch({ type: 'SET_ERROR', payload: proposalResponse.error_message || 'Failed to generate proposals' });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to generate proposals' });
    } finally {
      dispatch({ type: 'SET_PROPOSAL_LOADING', payload: false });
    }
  }, [state.itemName, state.creator, state.influenceQuestionResponses, state.influenceQuestions, state.expandedProposals, dispatch]);

  // Used in ProposalActions
  const acceptSelectedProposals = useCallback(async (): Promise<AcceptProposalsResponse | null> => {
    if (!state.proposals || state.selectedProposals.size === 0) {
      dispatch({ type: 'SET_ERROR', payload: 'Please select at least one proposal to accept' });
      return null;
    }

    dispatch({ type: 'SET_SAVE_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Get all original proposals
      const allProposals = [
        ...state.proposals.macro_influences,
        ...state.proposals.micro_influences,
        ...state.proposals.nano_influences
      ];

      // Get all nested specifics from expanded proposals
      const allSpecifics: any[] = [];
      Object.values(state.expandedProposals).forEach((specifics: any) => {
        if (Array.isArray(specifics)) {
          allSpecifics.push(...specifics);
        }
      });

      // Get all question responses (main item and individual influences)
      const allQuestionInfluences: any[] = [];
      
      // Add main item question influences
      if (state.mainItemQuestionResponse?.new_influences) {
        allQuestionInfluences.push(...state.mainItemQuestionResponse.new_influences);
      }
      
      // Add individual influence question influences
      Object.values(state.influenceQuestionResponses).forEach((response: any) => {
        if (response?.new_influences) {
          allQuestionInfluences.push(...response.new_influences);
        }
      });

      // Combine all available proposals
      const allAvailableProposals = [...allProposals, ...allSpecifics, ...allQuestionInfluences];

      // Filter for only selected proposals
      const selectedObjects = allAvailableProposals.filter(proposal => 
        state.selectedProposals.has(`${proposal.name}-${proposal.scope}`)
      );

     

      const request: AcceptProposalsRequest = {
        item_name: state.proposals.item_name,
        item_type: state.proposals.item_type,
        creator: state.proposals.creator,
        item_year: state.proposals.item_year,
        item_description: state.proposals.item_description,
        accepted_proposals: selectedObjects.map(p => ({ ...p, accepted: true }))
      };

      // Call API
      const result = await proposalApi.acceptProposals(request);
      
      // If conflict resolution is needed, return the result to let ProposalActions handle it
      if (result.requires_review) {
        return result;
      }
      
      // If successful, update state and clear selections
      if (result.success && result.item_id) {
        dispatch({ type: 'SET_SAVED_ITEM_ID', payload: result.item_id });
        dispatch({ type: 'SET_SELECTED_PROPOSALS', payload: new Set() });
        
        // Clear question responses after saving
        dispatch({ type: 'SET_MAIN_ITEM_QUESTION_RESPONSE', payload: null });
        
        // Clear all influence question responses
        Object.keys(state.influenceQuestionResponses).forEach(key => {
          dispatch({ type: 'REMOVE_INFLUENCE_QUESTION_RESPONSE', payload: key });
        });
      }
      
      return result;
      
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to save proposals' });
      return null;
    } finally {
      dispatch({ type: 'SET_SAVE_LOADING', payload: false });
    }
  }, [state, dispatch]);

  // Used in ProposalQuestion
  const askMainItemQuestion = useCallback(async () => {
    if (!state.proposals || !state.mainItemQuestionText.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a question' });
      return;
    }

    dispatch({ type: 'SET_MAIN_ITEM_QUESTION_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const request: UnifiedQuestionRequest = {
        item_name: state.proposals.item_name,
        item_type: state.proposals.item_type,
        creator: state.proposals.creator,
        item_year: state.proposals.item_year,
        item_description: state.proposals.item_description,
        question: state.mainItemQuestionText.trim(),
        // No target_influence_name = discovery mode
      };

      const response = await proposalApi.askQuestion(request);
      
      if (response.success) {
        dispatch({ type: 'SET_MAIN_ITEM_QUESTION_RESPONSE', payload: response });
        dispatch({ type: 'SET_MAIN_ITEM_QUESTION_TEXT', payload: '' }); // Clear the input
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error_message || 'Failed to process question' });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to process question' });
    } finally {
      dispatch({ type: 'SET_MAIN_ITEM_QUESTION_LOADING', payload: false });
    }
  }, [state.proposals, state.mainItemQuestionText, dispatch]);

  // Used in ProposalQuestion
  // Used in ProposalResults
  const askInfluenceQuestion = useCallback(async (proposal: any) => {
    if (!state.proposals) return;
    
    const proposalKey = `${proposal.name}-${proposal.scope}`;
    const questionText = state.influenceQuestions[proposalKey];
    
    if (!questionText?.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter a question' });
      return;
    }

    dispatch({ type: 'SET_INFLUENCE_QUESTION_LOADING', payload: { key: proposalKey, loading: true } });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const request: UnifiedQuestionRequest = {
        item_name: state.proposals.item_name,
        item_type: state.proposals.item_type,
        creator: state.proposals.creator,
        item_year: state.proposals.item_year,
        item_description: state.proposals.item_description,
        question: questionText.trim(),
        target_influence_name: proposal.name,
        target_influence_explanation: proposal.explanation,
      };

      const response = await proposalApi.askQuestion(request);
      
      if (response.success) {
        dispatch({ type: 'SET_INFLUENCE_QUESTION_RESPONSE', payload: { key: proposalKey, response } });
        // Clear the question input
        dispatch({ type: 'SET_INFLUENCE_QUESTION', payload: { key: proposalKey, value: '' } });
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.error_message || 'Failed to process question' });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to process question' });
    } finally {
      dispatch({ type: 'SET_INFLUENCE_QUESTION_LOADING', payload: { key: proposalKey, loading: false } });
    }
  }, [state.proposals, state.influenceQuestions, dispatch]);

  // Used in ProposalResults
  const getSpecifics = useCallback(async (proposal: any) => {
    if (!state.proposals) return;
    
    const proposalKey = `${proposal.name}-${proposal.scope}`;
    dispatch({ type: 'SET_LOADING_SPECIFICS', payload: { key: proposalKey, loading: true } });
    
    try {
      // Use unified question system
      const response = await proposalApi.askQuestion({
        item_name: state.proposals.item_name,
        item_type: state.proposals.item_type,
        creator: state.proposals.creator,
        item_year: state.proposals.item_year,
        item_description: state.proposals.item_description,
        question: "Which specific sources, songs, or works influenced this technique?",
        target_influence_name: proposal.name,
        target_influence_explanation: proposal.explanation,
      });
      
      if (response.success) {
        dispatch({ type: 'SET_EXPANDED_PROPOSALS', payload: { key: proposalKey, proposals: response.new_influences } });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to get specifics: ' + response.error_message });
      }
      
    } catch (error) {
      console.error('Error getting specifics:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get specifics. Please try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING_SPECIFICS', payload: { key: proposalKey, loading: false } });
    }
  }, [state.proposals, dispatch]);

  return {
    generateProposals,
    acceptSelectedProposals,
    askMainItemQuestion,
    askInfluenceQuestion,
    getSpecifics
  };
};
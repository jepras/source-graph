import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { 
  ProposalResponse, 
  UnifiedQuestionResponse 
} from '../services/api';

// Research State Interface
interface ResearchState {
  // Form state
  itemName: string;
  creator: string;
  
  // Proposal state
  proposals: ProposalResponse | null;
  proposalLoading: boolean;
  selectedProposals: Set<string>;
  
  // Question state
  mainItemQuestionText: string;
  mainItemQuestionLoading: boolean;
  mainItemQuestionResponse: UnifiedQuestionResponse | null;
  influenceQuestions: Record<string, string>;
  influenceQuestionLoading: Record<string, boolean>;
  influenceQuestionResponses: Record<string, UnifiedQuestionResponse>;
  
  // Expanded proposals (specifics)
  loadingSpecifics: Record<string, boolean>;
  expandedProposals: Record<string, any>;
  
  // Save state
  saveLoading: boolean;
  savedItemId: string | null;
  
  // Error state
  error: string | null;

  // Clustering state
  clusteringEnabled: boolean;
}

// Research Actions
type ResearchAction = 
  | { type: 'SET_ITEM_NAME'; payload: string }
  | { type: 'SET_CREATOR'; payload: string }
  | { type: 'SET_PROPOSALS'; payload: ProposalResponse | null }
  | { type: 'SET_PROPOSAL_LOADING'; payload: boolean }
  | { type: 'TOGGLE_PROPOSAL'; payload: string }
  | { type: 'SET_SELECTED_PROPOSALS'; payload: Set<string> }
  | { type: 'SET_MAIN_ITEM_QUESTION_TEXT'; payload: string }
  | { type: 'SET_MAIN_ITEM_QUESTION_LOADING'; payload: boolean }
  | { type: 'SET_MAIN_ITEM_QUESTION_RESPONSE'; payload: UnifiedQuestionResponse | null }
  | { type: 'SET_INFLUENCE_QUESTION'; payload: { key: string; value: string } }
  | { type: 'SET_INFLUENCE_QUESTION_LOADING'; payload: { key: string; loading: boolean } }
  | { type: 'SET_INFLUENCE_QUESTION_RESPONSE'; payload: { key: string; response: UnifiedQuestionResponse } }
  | { type: 'REMOVE_INFLUENCE_QUESTION_RESPONSE'; payload: string }
  | { type: 'SET_LOADING_SPECIFICS'; payload: { key: string; loading: boolean } }
  | { type: 'SET_EXPANDED_PROPOSALS'; payload: { key: string; proposals: any } }
  | { type: 'SET_SAVE_LOADING'; payload: boolean }
  | { type: 'SET_SAVED_ITEM_ID'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CLUSTERING_ENABLED'; payload: boolean }
  | { type: 'CLEAR_RESEARCH' };

// Initial State
const initialState: ResearchState = {
  itemName: '',
  creator: '',
  proposals: null,
  proposalLoading: false,
  selectedProposals: new Set(),
  mainItemQuestionText: '',
  mainItemQuestionLoading: false,
  mainItemQuestionResponse: null,
  influenceQuestions: {},
  influenceQuestionLoading: {},
  influenceQuestionResponses: {},
  loadingSpecifics: {},
  expandedProposals: {},
  saveLoading: false,
  savedItemId: null,
  error: null,
  clusteringEnabled: true
};

// Reducer
function researchReducer(state: ResearchState, action: ResearchAction): ResearchState {
  switch (action.type) {
    case 'SET_ITEM_NAME':
      return { ...state, itemName: action.payload };
    
    case 'SET_CREATOR':
      return { ...state, creator: action.payload };
    
    case 'SET_PROPOSALS':
      return { ...state, proposals: action.payload };
    
    case 'SET_PROPOSAL_LOADING':
      return { ...state, proposalLoading: action.payload };
    
    case 'TOGGLE_PROPOSAL':
      const newSelected = new Set(state.selectedProposals);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedProposals: newSelected };
    
    case 'SET_SELECTED_PROPOSALS':
      return { ...state, selectedProposals: action.payload };
    
    case 'SET_MAIN_ITEM_QUESTION_TEXT':
      return { ...state, mainItemQuestionText: action.payload };
    
    case 'SET_MAIN_ITEM_QUESTION_LOADING':
      return { ...state, mainItemQuestionLoading: action.payload };
    
    case 'SET_MAIN_ITEM_QUESTION_RESPONSE':
      return { ...state, mainItemQuestionResponse: action.payload };
    
    case 'SET_INFLUENCE_QUESTION':
      return {
        ...state,
        influenceQuestions: {
          ...state.influenceQuestions,
          [action.payload.key]: action.payload.value
        }
      };
    
    case 'SET_INFLUENCE_QUESTION_LOADING':
      return {
        ...state,
        influenceQuestionLoading: {
          ...state.influenceQuestionLoading,
          [action.payload.key]: action.payload.loading
        }
      };
    
    case 'SET_INFLUENCE_QUESTION_RESPONSE':
      return {
        ...state,
        influenceQuestionResponses: {
          ...state.influenceQuestionResponses,
          [action.payload.key]: action.payload.response
        }
      };
    
    case 'REMOVE_INFLUENCE_QUESTION_RESPONSE':
      const newResponses = { ...state.influenceQuestionResponses };
      delete newResponses[action.payload];
      return { ...state, influenceQuestionResponses: newResponses };
    
    case 'SET_LOADING_SPECIFICS':
      return {
        ...state,
        loadingSpecifics: {
          ...state.loadingSpecifics,
          [action.payload.key]: action.payload.loading
        }
      };
    
    case 'SET_EXPANDED_PROPOSALS':
      return {
        ...state,
        expandedProposals: {
          ...state.expandedProposals,
          [action.payload.key]: action.payload.proposals
        }
      };
    
    case 'SET_SAVE_LOADING':
      return { ...state, saveLoading: action.payload };
    
    case 'SET_SAVED_ITEM_ID':
      return { ...state, savedItemId: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_RESEARCH':
      return {
        ...initialState,
        // Keep form data if user wants to research something similar
        itemName: '',
        creator: ''
      };

    case 'SET_CLUSTERING_ENABLED':
      return { ...state, clusteringEnabled: action.payload };
    
    default:
      return state;
  }
}

// Context
interface ResearchContextType {
  state: ResearchState;
  dispatch: React.Dispatch<ResearchAction>;
  // Helper functions
  setItemName: (name: string) => void;
  setCreator: (creator: string) => void;
  toggleProposal: (proposalKey: string) => void;
  isProposalSelected: (proposalName: string, scope: string) => boolean;
  clearResearch: () => void;
  setError: (error: string | null) => void;
  setProposalLoading: (loading: boolean) => void;
  setSaveLoading: (loading: boolean) => void;
  setClusteringEnabled: (enabled: boolean) => void;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

// Provider Component
interface ResearchProviderProps {
  children: ReactNode;
}

export const ResearchProvider: React.FC<ResearchProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(researchReducer, initialState);

  // Helper functions
  const setItemName = (name: string) => {
    dispatch({ type: 'SET_ITEM_NAME', payload: name });
  };

  const setCreator = (creator: string) => {
    dispatch({ type: 'SET_CREATOR', payload: creator });
  };

  const toggleProposal = (proposalKey: string) => {
    dispatch({ type: 'TOGGLE_PROPOSAL', payload: proposalKey });
  };

  const isProposalSelected = (proposalName: string, scope: string) => {
    const key = `${proposalName}-${scope}`;
    return state.selectedProposals.has(key);
  };

  const clearResearch = () => {
    dispatch({ type: 'CLEAR_RESEARCH' });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setProposalLoading = (loading: boolean) => {
    dispatch({ type: 'SET_PROPOSAL_LOADING', payload: loading });
  };

  const setSaveLoading = (loading: boolean) => {
    dispatch({ type: 'SET_SAVE_LOADING', payload: loading });
  };

  const setClusteringEnabled = (enabled: boolean) => {
    dispatch({ type: 'SET_CLUSTERING_ENABLED', payload: enabled });
  };

  const value: ResearchContextType = {
    state,
    dispatch,
    setItemName,
    setCreator,
    toggleProposal,
    isProposalSelected,
    clearResearch,
    setError,
    setProposalLoading,
    setSaveLoading,
    setClusteringEnabled

  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
};

// Custom Hook
export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (context === undefined) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};
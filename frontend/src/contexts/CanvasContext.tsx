import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { CanvasState, CanvasDocument, DocumentSection, ChatMessage, ActivityLogEntry, ResearchState } from '../types/canvas';

// Canvas Actions
type CanvasAction = 
  | { type: 'SET_RESEARCH_STATE'; payload: ResearchState }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENT'; payload: CanvasDocument | null }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_SECTION'; payload: { sectionId: string; updates: Partial<DocumentSection> } }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'ADD_SECTIONS'; payload: { sections: DocumentSection[]; insertAfter?: string } }
  | { type: 'SET_SECTION_LOADING'; payload: { sectionId: string; loading: boolean } }
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'SET_ACTIVE_MODEL'; payload: string }
  | { type: 'SET_USE_TWO_AGENT'; payload: boolean }
  | { type: 'ADD_ACTIVITY_LOG'; payload: ActivityLogEntry }
  | { type: 'UPDATE_ACTIVITY_LOG'; payload: { id: string; updates: Partial<ActivityLogEntry> } }
  | { type: 'CLEAR_ACTIVITY_LOGS' }
  | { type: 'CLEAR_CANVAS' }
  // Streaming actions
  | { type: 'ADD_STREAMING_CHUNK'; payload: string }
  | { type: 'SET_STREAMING_STAGE'; payload: string | null }
  | { type: 'SET_STREAMING_PROGRESS'; payload: number }
  | { type: 'CLEAR_STREAMING' };

// Initial State
const initialState: CanvasState = {
  currentDocument: null,
  researchState: 'idle',
  error: null,
  chatHistory: [],
  sectionLoadingStates: {},
  selectedModel: 'gemini-2.5-flash', // Default model
  activeModel: 'gemini-2.5-flash',    // Currently active model (may differ due to fallback)
  use_two_agent: true,         // Use two-agent system instead of single-agent
  activityLogs: [],             // Research activity logs
  // Streaming state (only used during streaming)
  streamingOutput: [],          // Array of streaming chunks received
  streamingStage: null,         // Current streaming stage
  streamingProgress: 0,         // Progress percentage (0-100)
};

// Reducer
function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_RESEARCH_STATE':
      return { ...state, researchState: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_DOCUMENT':
      return { ...state, currentDocument: action.payload };
    
    case 'ADD_CHAT_MESSAGE':
      return { 
        ...state, 
        chatHistory: [...state.chatHistory, action.payload]
      };
    
    case 'UPDATE_SECTION':
      if (!state.currentDocument) return state;
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          sections: state.currentDocument.sections.map(section =>
            section.id === action.payload.sectionId
              ? { ...section, ...action.payload.updates }
              : section
          )
        }
      };
    
    case 'DELETE_SECTION':
      if (!state.currentDocument) return state;
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          sections: state.currentDocument.sections.filter(
            section => section.id !== action.payload
          )
        }
      };
    
    case 'ADD_SECTIONS':
      if (!state.currentDocument) return state;
      const { sections: newSections, insertAfter } = action.payload;
      
      if (!insertAfter) {
        // Add to end
        return {
          ...state,
          currentDocument: {
            ...state.currentDocument,
            sections: [...state.currentDocument.sections, ...newSections]
          }
        };
      }
      
      // Insert after specific section
      const insertIndex = state.currentDocument.sections.findIndex(s => s.id === insertAfter);
      const updatedSections = [...state.currentDocument.sections];
      updatedSections.splice(insertIndex + 1, 0, ...newSections);
      
      return {
        ...state,
        currentDocument: {
          ...state.currentDocument,
          sections: updatedSections
        }
      };
    
    case 'SET_SECTION_LOADING':
      return {
        ...state,
        sectionLoadingStates: {
          ...state.sectionLoadingStates,
          [action.payload.sectionId]: action.payload.loading
        }
      };
    
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };
    
    case 'SET_ACTIVE_MODEL':
      return { ...state, activeModel: action.payload };
    
    case 'SET_USE_TWO_AGENT':
      return { ...state, use_two_agent: action.payload };
    
    case 'ADD_ACTIVITY_LOG':
      return {
        ...state,
        activityLogs: [...state.activityLogs, action.payload]
      };
    
    case 'UPDATE_ACTIVITY_LOG':
      return {
        ...state,
        activityLogs: state.activityLogs.map(log =>
          log.id === action.payload.id
            ? { ...log, ...action.payload.updates }
            : log
        )
      };
    
    case 'CLEAR_ACTIVITY_LOGS':
      return {
        ...state,
        activityLogs: []
      };
    
    case 'CLEAR_CANVAS':
      return {
        ...initialState,
        selectedModel: state.selectedModel, // Keep model selection when clearing canvas
        activeModel: state.selectedModel
      };
    
    // Streaming actions
    case 'ADD_STREAMING_CHUNK':
      return { 
        ...state, 
        streamingOutput: [...state.streamingOutput, action.payload]
      };
    
    case 'SET_STREAMING_STAGE':
      return { ...state, streamingStage: action.payload };
    
    case 'SET_STREAMING_PROGRESS':
      return { ...state, streamingProgress: action.payload };
    
    case 'CLEAR_STREAMING':
      return { 
        ...state, 
        streamingOutput: [],
        streamingStage: null,
        streamingProgress: 0
      };
    
    default:
      return state;
  }
}

// Context
interface CanvasContextType {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  // Helper functions
  setResearchState: (state: ResearchState) => void;
  setError: (error: string | null) => void;
  setDocument: (document: CanvasDocument | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateSection: (sectionId: string, updates: Partial<DocumentSection>) => void;
  deleteSection: (sectionId: string) => void;
  addSections: (sections: DocumentSection[], insertAfter?: string) => void;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
  setSelectedModel: (model: string) => void;
  setActiveModel: (model: string) => void;
  setUseTwoAgent: (useTwoAgent: boolean) => void;
  addActivityLog: (log: ActivityLogEntry) => void;
  updateActivityLog: (id: string, updates: Partial<ActivityLogEntry>) => void;
  clearActivityLogs: () => void;
  clearCanvas: () => void;
  // Streaming helper functions
  addStreamingChunk: (chunk: string) => void;
  setStreamingStage: (stage: string | null) => void;
  setStreamingProgress: (progress: number) => void;
  clearStreaming: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

// Provider Component
interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  // Helper functions
  const setResearchState = (researchState: ResearchState) => {
    dispatch({ type: 'SET_RESEARCH_STATE', payload: researchState });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setDocument = (document: CanvasDocument | null) => {
    dispatch({ type: 'SET_DOCUMENT', payload: document });
  };

  const addChatMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
  };

  const updateSection = (sectionId: string, updates: Partial<DocumentSection>) => {
    dispatch({ type: 'UPDATE_SECTION', payload: { sectionId, updates } });
  };

  const deleteSection = (sectionId: string) => {
    dispatch({ type: 'DELETE_SECTION', payload: sectionId });
  };

  const addSections = (sections: DocumentSection[], insertAfter?: string) => {
    dispatch({ type: 'ADD_SECTIONS', payload: { sections, insertAfter } });
  };

  const setSectionLoading = (sectionId: string, loading: boolean) => {
    dispatch({ type: 'SET_SECTION_LOADING', payload: { sectionId, loading } });
  };

  const setSelectedModel = (model: string) => {
    dispatch({ type: 'SET_SELECTED_MODEL', payload: model });
  };

  const setActiveModel = (model: string) => {
    dispatch({ type: 'SET_ACTIVE_MODEL', payload: model });
  };

  const setUseTwoAgent = (useTwoAgent: boolean) => {
    dispatch({ type: 'SET_USE_TWO_AGENT', payload: useTwoAgent });
  };

  const addActivityLog = (log: ActivityLogEntry) => {
    dispatch({ type: 'ADD_ACTIVITY_LOG', payload: log });
  };

  const updateActivityLog = (id: string, updates: Partial<ActivityLogEntry>) => {
    dispatch({ type: 'UPDATE_ACTIVITY_LOG', payload: { id, updates } });
  };

  const clearActivityLogs = () => {
    dispatch({ type: 'CLEAR_ACTIVITY_LOGS' });
  };

  const clearCanvas = () => {
    dispatch({ type: 'CLEAR_CANVAS' });
  };

  // Streaming helper functions
  const addStreamingChunk = (chunk: string) => {
    dispatch({ type: 'ADD_STREAMING_CHUNK', payload: chunk });
  };

  const setStreamingStage = (stage: string | null) => {
    dispatch({ type: 'SET_STREAMING_STAGE', payload: stage });
  };

  const setStreamingProgress = (progress: number) => {
    dispatch({ type: 'SET_STREAMING_PROGRESS', payload: progress });
  };

  const clearStreaming = () => {
    dispatch({ type: 'CLEAR_STREAMING' });
  };

  const value: CanvasContextType = {
    state,
    dispatch,
    setResearchState,
    setError,
    setDocument,
    addChatMessage,
    updateSection,
    deleteSection,
    addSections,
    setSectionLoading,
    setSelectedModel,
    setActiveModel,
    setUseTwoAgent,
    addActivityLog,
    updateActivityLog,
    clearActivityLogs,
    clearCanvas,
    // Streaming helper functions
    addStreamingChunk,
    setStreamingStage,
    setStreamingProgress,
    clearStreaming
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

// Custom Hook
export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
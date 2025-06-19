import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { CanvasState, CanvasDocument, DocumentSection, ChatMessage } from '../types/canvas';

// Canvas Actions
type CanvasAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENT'; payload: CanvasDocument | null }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_SECTION'; payload: { sectionId: string; updates: Partial<DocumentSection> } }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'ADD_SECTIONS'; payload: { sections: DocumentSection[]; insertAfter?: string } }
  | { type: 'SET_SECTION_LOADING'; payload: { sectionId: string; loading: boolean } }
  | { type: 'CLEAR_CANVAS' };

// Initial State
const initialState: CanvasState = {
  currentDocument: null,
  loading: false,
  error: null,
  chatHistory: [],
  sectionLoadingStates: {}
};

// Reducer
function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
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
    
    case 'CLEAR_CANVAS':
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface CanvasContextType {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  // Helper functions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDocument: (document: CanvasDocument | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateSection: (sectionId: string, updates: Partial<DocumentSection>) => void;
  deleteSection: (sectionId: string) => void;
  addSections: (sections: DocumentSection[], insertAfter?: string) => void;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
  clearCanvas: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

// Provider Component
interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  // Helper functions
  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
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

  const clearCanvas = () => {
    dispatch({ type: 'CLEAR_CANVAS' });
  };

  const value: CanvasContextType = {
    state,
    dispatch,
    setLoading,
    setError,
    setDocument,
    addChatMessage,
    updateSection,
    deleteSection,
    addSections,
    setSectionLoading,
    clearCanvas
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
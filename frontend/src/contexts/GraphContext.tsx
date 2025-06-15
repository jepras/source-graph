import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../types/graph';

// Graph State Interface
interface GraphState {
  accumulatedGraph: AccumulatedGraph;
  selectedNodeId: string | null;
  isChronologicalOrder: boolean;
  isCategoricalLayout: boolean;
  isClusteringEnabled: boolean; // NEW: Add clustering toggle
  loading: boolean;
  error: string | null;
  nodePositions: Map<string, { x: number; y: number }>; // ADD this
  expandedNodes: Set<string>; // ADD this to track which nodes have been expanded
}

// Graph Actions
type GraphAction = 
  | { type: 'SET_SELECTED_NODE'; payload: string | null }
  | { type: 'SET_CHRONOLOGICAL_ORDER'; payload: boolean }
  | { type: 'SET_CATEGORICAL_LAYOUT'; payload: boolean }
  | { type: 'SET_CLUSTERING_ENABLED'; payload: boolean } // NEW: Add clustering action
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NODES'; payload: GraphNode[] }
  | { type: 'ADD_LINKS'; payload: GraphLink[] }
  | { type: 'SET_GRAPH'; payload: AccumulatedGraph }
  | { type: 'CLEAR_GRAPH' }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; updates: Partial<GraphNode> } }
  | { type: 'PRESERVE_POSITIONS'; payload: Map<string, { x: number; y: number }> }
  | { type: 'MARK_NODE_EXPANDED'; payload: string }
  | { type: 'ACCUMULATE_GRAPH'; payload: { graphData: GraphResponse; preservePositions: boolean } }
  | { type: 'REMOVE_NODE'; payload: string }; 



// Initial State
const initialState: GraphState = {
  accumulatedGraph: {
    nodes: new Map(),
    relationships: new Map(),
    selectedNodeId: null,
    expandedNodeIds: new Set()
  },
  selectedNodeId: null,
  isChronologicalOrder: false,
  isCategoricalLayout: false,
  isClusteringEnabled: true, // NEW: Default clustering enabled
  loading: false,
  error: null,
  nodePositions: new Map(),
  expandedNodes: new Set(),
};

// Reducer
function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'SET_SELECTED_NODE':
      return {
        ...state,
        selectedNodeId: action.payload,
        accumulatedGraph: {
          ...state.accumulatedGraph,
          selectedNodeId: action.payload
        }
      };
    
    case 'SET_CHRONOLOGICAL_ORDER':
      return {
        ...state,
        isChronologicalOrder: action.payload
      };
    
    case 'SET_CATEGORICAL_LAYOUT':
      return {
        ...state,
        isCategoricalLayout: action.payload
      };
    
    case 'SET_CLUSTERING_ENABLED': // NEW: Handle clustering toggle
      return {
        ...state,
        isClusteringEnabled: action.payload
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    case 'ADD_NODES':
      const newNodes = new Map(state.accumulatedGraph.nodes);
      action.payload.forEach(node => {
        newNodes.set(node.id, node);
      });
      return {
        ...state,
        accumulatedGraph: {
          ...state.accumulatedGraph,
          nodes: newNodes
        }
      };
    
    case 'ADD_LINKS':
      const newRelationships = new Map(state.accumulatedGraph.relationships);
      action.payload.forEach(link => {
        const linkId = `${link.source}-${link.target}`;
        newRelationships.set(linkId, link);
      });
      return {
        ...state,
        accumulatedGraph: {
          ...state.accumulatedGraph,
          relationships: newRelationships
        }
      };
    
    case 'SET_GRAPH':
      return {
        ...state,
        accumulatedGraph: action.payload,
        selectedNodeId: action.payload.selectedNodeId
      };
    
    case 'CLEAR_GRAPH':
      return {
        ...state,
        accumulatedGraph: {
          nodes: new Map(),
          relationships: new Map(),
          selectedNodeId: null,
          expandedNodeIds: new Set()
        },
        selectedNodeId: null,
        error: null
      };
    
    case 'UPDATE_NODE':
      const updatedNodes = new Map(state.accumulatedGraph.nodes);
      const existingNode = updatedNodes.get(action.payload.nodeId);
      if (existingNode) {
        updatedNodes.set(action.payload.nodeId, {
          ...existingNode,
          ...action.payload.updates
        });
      }
      return {
        ...state,
        accumulatedGraph: {
          ...state.accumulatedGraph,
          nodes: updatedNodes
        }
      };
    
      case 'PRESERVE_POSITIONS':
        return {
          ...state,
          nodePositions: action.payload,
        };
        
      case 'MARK_NODE_EXPANDED':
        return {
          ...state,
          expandedNodes: new Set([...state.expandedNodes, action.payload]),
        };
        
      case 'ACCUMULATE_GRAPH':
        if (action.payload.preservePositions) {
          // Merge new data with existing, preserving positions
          return {
            ...state,
            data: action.payload.graphData,
            loading: false,
            error: null,
          };
        } else {
          // Normal replacement behavior
          return {
            ...state,
            data: action.payload.graphData,
            nodePositions: new Map(),
            expandedNodes: new Set(),
            loading: false,
            error: null,
          };
        }
      
      case 'REMOVE_NODE':
        const nodeToRemove = action.payload;
        const filteredNodes = new Map(state.accumulatedGraph.nodes);
        const filteredRelationships = new Map(state.accumulatedGraph.relationships);
        
        // Remove the node
        filteredNodes.delete(nodeToRemove);
        
        // Remove all relationships involving this node
        for (const [linkId, link] of filteredRelationships.entries()) {
          if (link.source === nodeToRemove || link.target === nodeToRemove) {
            filteredRelationships.delete(linkId);
          }
        }
        
        // Clear selection if the deleted node was selected
        const newSelectedNodeId = state.selectedNodeId === nodeToRemove ? null : state.selectedNodeId;
        
        return {
          ...state,
          accumulatedGraph: {
            ...state.accumulatedGraph,
            nodes: filteredNodes,
            relationships: filteredRelationships,
            selectedNodeId: newSelectedNodeId
          },
          selectedNodeId: newSelectedNodeId
        };

      default:
        return state;
  }
}

// Context
interface GraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
  // Helper functions
  selectNode: (nodeId: string | null) => void;
  toggleChronologicalOrder: () => void;
  toggleCategoricalLayout: () => void;
  toggleClustering: () => void; // NEW: Add clustering toggle function
  addNodesAndLinks: (nodes: GraphNode[], links: GraphLink[]) => void;
  clearGraph: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  removeNodeFromGraph: (nodeId: string) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

// Provider Component
interface GraphProviderProps {
  children: ReactNode;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  // Helper functions
  const selectNode = (nodeId: string | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: nodeId });
  };

  const toggleChronologicalOrder = () => {
    dispatch({ type: 'SET_CHRONOLOGICAL_ORDER', payload: !state.isChronologicalOrder });
  };

  const toggleCategoricalLayout = () => {
    dispatch({ type: 'SET_CATEGORICAL_LAYOUT', payload: !state.isCategoricalLayout });
  };

  const toggleClustering = () => { // NEW: Add clustering toggle function
    dispatch({ type: 'SET_CLUSTERING_ENABLED', payload: !state.isClusteringEnabled });
  };

  const addNodesAndLinks = (nodes: GraphNode[], links: GraphLink[]) => {
    dispatch({ type: 'ADD_NODES', payload: nodes });
    dispatch({ type: 'ADD_LINKS', payload: links });
  };

  const clearGraph = () => {
    dispatch({ type: 'CLEAR_GRAPH' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const removeNodeFromGraph = (nodeId: string) => {
    dispatch({ type: 'REMOVE_NODE', payload: nodeId });
  };

  const value: GraphContextType = {
    state,
    dispatch,
    selectNode,
    toggleChronologicalOrder,
    toggleCategoricalLayout,
    toggleClustering, // NEW: Add to context value
    addNodesAndLinks,
    clearGraph,
    setLoading,
    setError,
    removeNodeFromGraph
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};

// Custom Hook
export const useGraph = () => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
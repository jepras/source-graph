import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AccumulatedGraph, GraphNode, GraphLink, CustomCluster } from '../types/graph';

// Graph State Interface
interface GraphState {
  accumulatedGraph: AccumulatedGraph;
  selectedNodeId: string | null;
  highlightedEdgeIds: Set<string>; // New: tracks edges connected to selected node
  isChronologicalOrder: boolean;
  isCategoricalLayout: boolean;
  isClusteringEnabled: boolean;
  clusteringMode: 'item' | 'custom'; // New: item-based or custom
  customClusters: CustomCluster[]; // New: stores user-defined clusters
  loading: boolean;
  error: string | null;
  nodePositions: Map<string, { x: number; y: number }>;
  expandedNodes: Set<string>;
}

// Graph Actions
type GraphAction =
  | { type: 'SET_SELECTED_NODE'; payload: string | null }
  | { type: 'SET_HIGHLIGHTED_EDGES'; payload: Set<string> } // New: set highlighted edges
  | { type: 'CLEAR_HIGHLIGHTED_EDGES' } // New: clear highlighted edges
  | { type: 'SET_CHRONOLOGICAL_ORDER'; payload: boolean }
  | { type: 'SET_CATEGORICAL_LAYOUT'; payload: boolean }
  | { type: 'SET_CLUSTERING_ENABLED'; payload: boolean }
  | { type: 'SET_CLUSTERING_MODE'; payload: 'item' | 'custom' }
  | { type: 'SET_CUSTOM_CLUSTERS'; payload: CustomCluster[] }
  | { type: 'ADD_CUSTOM_CLUSTER'; payload: CustomCluster }
  | { type: 'UPDATE_CUSTOM_CLUSTER'; payload: { clusterId: string; updates: Partial<CustomCluster> } }
  | { type: 'DELETE_CUSTOM_CLUSTER'; payload: string }
  | { type: 'MOVE_NODE_TO_CLUSTER'; payload: { nodeId: string; newClusterId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NODES'; payload: GraphNode[] }
  | { type: 'ADD_LINKS'; payload: GraphLink[] }
  | { type: 'SET_GRAPH'; payload: AccumulatedGraph }
  | { type: 'CLEAR_GRAPH' }
  | { type: 'UPDATE_NODE'; payload: { nodeId: string; updates: Partial<GraphNode> } }
  | { type: 'PRESERVE_POSITIONS'; payload: Map<string, { x: number; y: number }> }
  | { type: 'MARK_NODE_EXPANDED'; payload: string }
  | { type: 'ACCUMULATE_GRAPH'; payload: { graphData: any; preservePositions: boolean } }
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
  highlightedEdgeIds: new Set(), // New: initialize empty set
  isChronologicalOrder: true,
  isCategoricalLayout: false,
  isClusteringEnabled: true,
  clusteringMode: 'item',
  customClusters: [],
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
        accumulatedGraph: { ...state.accumulatedGraph, selectedNodeId: action.payload }
      };
    case 'SET_HIGHLIGHTED_EDGES':
      return { ...state, highlightedEdgeIds: action.payload };
    case 'CLEAR_HIGHLIGHTED_EDGES':
      return { ...state, highlightedEdgeIds: new Set() };
    case 'SET_CHRONOLOGICAL_ORDER':
      return { ...state, isChronologicalOrder: action.payload };
    case 'SET_CATEGORICAL_LAYOUT':
      return { ...state, isCategoricalLayout: action.payload };
    case 'SET_CLUSTERING_ENABLED':
      return { ...state, isClusteringEnabled: action.payload };
    case 'SET_CLUSTERING_MODE':
      return { ...state, clusteringMode: action.payload };
    case 'SET_CUSTOM_CLUSTERS':
      return { ...state, customClusters: action.payload };
    case 'ADD_CUSTOM_CLUSTER':
      return { ...state, customClusters: [...state.customClusters, action.payload] };
    case 'UPDATE_CUSTOM_CLUSTER':
      return {
        ...state,
        customClusters: state.customClusters.map(c =>
          c.id === action.payload.clusterId ? { ...c, ...action.payload.updates } : c
        ),
      };
    case 'DELETE_CUSTOM_CLUSTER':
      const clusterToRemove = state.customClusters.find(c => c.id === action.payload);
      if (!clusterToRemove) return state;
      const uncategorizedCluster = state.customClusters.find(c => c.name === 'Uncategorized');
      if (!uncategorizedCluster) return state; // Should not happen

      // Move nodes from deleted cluster to "Uncategorized"
      uncategorizedCluster.nodeIds.push(...clusterToRemove.nodeIds);

      return {
        ...state,
        customClusters: state.customClusters.filter(c => c.id !== action.payload),
      };
    case 'MOVE_NODE_TO_CLUSTER':
      const { nodeId, newClusterId } = action.payload;
      const newClusters = state.customClusters.map(cluster => {
        // Remove node from its old cluster
        const newNodeIds = cluster.nodeIds.filter(id => id !== nodeId);
        // Add node to its new cluster
        if (cluster.id === newClusterId) {
          newNodeIds.push(nodeId);
        }
        return { ...cluster, nodeIds: newNodeIds };
      });
      return { ...state, customClusters: newClusters };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_NODES':
      const newNodes = new Map(state.accumulatedGraph.nodes);
      action.payload.forEach(node => { newNodes.set(node.id, node); });
      return { ...state, accumulatedGraph: { ...state.accumulatedGraph, nodes: newNodes } };
    case 'ADD_LINKS':
      const newRelationships = new Map(state.accumulatedGraph.relationships);
      action.payload.forEach(link => {
        const linkId = `${link.source}-${link.target}`;
        newRelationships.set(linkId, link);
      });
      return { ...state, accumulatedGraph: { ...state.accumulatedGraph, relationships: newRelationships } };
    case 'SET_GRAPH':
      return { ...state, accumulatedGraph: action.payload, selectedNodeId: action.payload.selectedNodeId };
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
        highlightedEdgeIds: new Set(), // Clear highlighted edges too
        error: null,
        customClusters: [], // Also clear custom clusters
      };
    case 'UPDATE_NODE':
      const updatedNodes = new Map(state.accumulatedGraph.nodes);
      const existingNode = updatedNodes.get(action.payload.nodeId);
      if (existingNode) {
        updatedNodes.set(action.payload.nodeId, { ...existingNode, ...action.payload.updates });
      }
      return { ...state, accumulatedGraph: { ...state.accumulatedGraph, nodes: updatedNodes } };
    case 'REMOVE_NODE':
      const nodeToRemove = action.payload;
      const filteredNodes = new Map(state.accumulatedGraph.nodes);
      filteredNodes.delete(nodeToRemove);
      const filteredRelationships = new Map(state.accumulatedGraph.relationships);
      for (const [linkId, link] of filteredRelationships.entries()) {
        if (link.source === nodeToRemove || link.target === nodeToRemove) {
          filteredRelationships.delete(linkId);
        }
      }
      const newSelectedNodeId = state.selectedNodeId === nodeToRemove ? null : state.selectedNodeId;
      // Also remove from custom clusters
      const updatedCustomClusters = state.customClusters.map(c => ({
        ...c,
        nodeIds: c.nodeIds.filter(id => id !== nodeToRemove),
      }));
      return {
        ...state,
        accumulatedGraph: {
          ...state.accumulatedGraph,
          nodes: filteredNodes,
          relationships: filteredRelationships,
          selectedNodeId: newSelectedNodeId
        },
        selectedNodeId: newSelectedNodeId,
        customClusters: updatedCustomClusters,
      };
    default:
      return state;
  }
}

// Context
interface GraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
  selectNode: (nodeId: string | null) => void;
  highlightEdgesForNode: (nodeId: string | null) => void; // New: highlight edges for a node
  clearHighlightedEdges: () => void; // New: clear highlighted edges
  toggleChronologicalOrder: () => void;
  toggleClustering: () => void;
  setClusteringMode: (mode: 'item' | 'custom') => void;
  initializeCustomClusters: (nodes: GraphNode[], mainItemId: string) => void;
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

  const selectNode = (nodeId: string | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: nodeId });
  };

  const highlightEdgesForNode = (nodeId: string | null) => {
    if (!nodeId) {
      dispatch({ type: 'CLEAR_HIGHLIGHTED_EDGES' });
      return;
    }

    // Find all edges connected to this node
    const connectedEdgeIds = new Set<string>();
    for (const [linkId, link] of state.accumulatedGraph.relationships.entries()) {
      if (link.source === nodeId || link.target === nodeId) {
        connectedEdgeIds.add(linkId);
      }
    }
    
    dispatch({ type: 'SET_HIGHLIGHTED_EDGES', payload: connectedEdgeIds });
  };

  const clearHighlightedEdges = () => {
    dispatch({ type: 'CLEAR_HIGHLIGHTED_EDGES' });
  };

  const toggleChronologicalOrder = () => {
    dispatch({ type: 'SET_CHRONOLOGICAL_ORDER', payload: !state.isChronologicalOrder });
  };

  const toggleClustering = () => {
    dispatch({ type: 'SET_CLUSTERING_ENABLED', payload: !state.isClusteringEnabled });
  };

  const setClusteringMode = (mode: 'item' | 'custom') => {
    dispatch({ type: 'SET_CLUSTERING_MODE', payload: mode });
  };

  const initializeCustomClusters = (nodes: GraphNode[], mainItemId: string) => {
    const researchFocusCluster: CustomCluster = {
      id: 'research-focus',
      name: 'Research Focus',
      nodeIds: [mainItemId],
    };
    const uncategorizedCluster: CustomCluster = {
      id: 'uncategorized',
      name: 'Uncategorized',
      nodeIds: nodes.filter(n => n.id !== mainItemId).map(n => n.id),
    };
    dispatch({ type: 'SET_CUSTOM_CLUSTERS', payload: [researchFocusCluster, uncategorizedCluster] });
  };

  const addNodesAndLinks = (nodes: GraphNode[], links: GraphLink[]) => {
    dispatch({ type: 'ADD_NODES', payload: nodes });
    dispatch({ type: 'ADD_LINKS', payload: links });

    // If in custom mode, add new nodes to the "Uncategorized" cluster
    if (state.clusteringMode === 'custom') {
      const uncategorizedCluster = state.customClusters.find(c => c.id === 'uncategorized');
      if (uncategorizedCluster) {
        const newNodeIds = nodes.map(n => n.id);
        const updatedCluster = {
          ...uncategorizedCluster,
          nodeIds: [...uncategorizedCluster.nodeIds, ...newNodeIds],
        };
        dispatch({
          type: 'UPDATE_CUSTOM_CLUSTER',
          payload: { clusterId: 'uncategorized', updates: updatedCluster },
        });
      }
    }
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
    highlightEdgesForNode,
    clearHighlightedEdges,
    toggleChronologicalOrder,
    toggleClustering,
    setClusteringMode,
    initializeCustomClusters,
    addNodesAndLinks,
    clearGraph,
    setLoading,
    setError,
    removeNodeFromGraph,
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

import { useCallback } from 'react';
import { api } from '../services/api';
import { useGraph } from '../contexts/GraphContext';
import { extractNodesAndRelationships } from '../utils/graphUtils';
import type { GraphNode, GraphLink } from '../types/graph';

export const useGraphOperations = () => {
  const { state, dispatch, addNodesAndLinks, clearGraph, selectNode, setLoading, setError, triggerLayoutRecalculation } = useGraph();

  // Helper function
  const checkIfItemExistsInGraph = useCallback((itemId: string, itemName?: string): string | null => {
    if (!state.accumulatedGraph.nodes.size) return null;
    
    // First check by item ID (most reliable)
    if (state.accumulatedGraph.nodes.has(itemId)) {
      return itemId;
    }
    
    // Fall back to checking by name if provided
    if (itemName) {
      for (const [nodeId, node] of state.accumulatedGraph.nodes.entries()) {
        if (node.name.toLowerCase() === itemName.toLowerCase()) {
          return nodeId;
        }
      }
    }
    
    return null;
  }, [state.accumulatedGraph.nodes]);

  // Used in MainLayout
  const loadItemInfluences = useCallback(async (itemId: string) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await api.getInfluences(itemId);
      
      // Check if this item is already in the graph or connected to existing graph
      const existingNodeIds = new Set(state.accumulatedGraph.nodes.keys());
      const isConnectedToExistingGraph = 
        existingNodeIds.has(response.main_item.id) ||
        response.influences.some(influence => 
          existingNodeIds.has(influence.from_item.id) || 
          existingNodeIds.has(influence.to_item.id)
        );
  
      // If not connected to existing graph, clear it first
      if (!isConnectedToExistingGraph && state.accumulatedGraph.nodes.size > 0) {
        clearGraph();
      }
  
      // Use your existing utility function to convert API response to graph format
      const { nodes, relationships } = extractNodesAndRelationships(response, state.accumulatedGraph);
      
      // Convert Maps to arrays for the context
      const nodeArray = Array.from(nodes.values());
      const linkArray = Array.from(relationships.values());
  
      addNodesAndLinks(nodeArray, linkArray);
      selectNode(itemId);
  
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load influences');
    } finally {
      setLoading(false);
    }
  }, [addNodesAndLinks, selectNode, setLoading, setError, state.accumulatedGraph.nodes, clearGraph]);

  // Used in MainLayout for loading items without automatically selecting them
  const loadItemInfluencesWithoutSelection = useCallback(async (itemId: string) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await api.getInfluences(itemId);
      
      // Check if this item is already in the graph or connected to existing graph
      const existingNodeIds = new Set(state.accumulatedGraph.nodes.keys());
      const isConnectedToExistingGraph = 
        existingNodeIds.has(response.main_item.id) ||
        response.influences.some(influence => 
          existingNodeIds.has(influence.from_item.id) || 
          existingNodeIds.has(influence.to_item.id)
        );
  
      // If not connected to existing graph, clear it first
      if (!isConnectedToExistingGraph && state.accumulatedGraph.nodes.size > 0) {
        clearGraph();
      }
  
      // Use your existing utility function to convert API response to graph format
      const { nodes, relationships } = extractNodesAndRelationships(response, state.accumulatedGraph);
      
      // Convert Maps to arrays for the context
      const nodeArray = Array.from(nodes.values());
      const linkArray = Array.from(relationships.values());
  
      addNodesAndLinks(nodeArray, linkArray);
      // Note: We don't call selectNode here - the item details panel should only open when a node is explicitly clicked
  
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load influences');
    } finally {
      setLoading(false);
    }
  }, [addNodesAndLinks, setLoading, setError, state.accumulatedGraph.nodes, clearGraph]);

  // Used in MainLayout
  const searchAndLoadItem = useCallback(async (query: string) => {
    try {
      const items = await api.searchItems(query);
      return items;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    }
  }, [setError]);

  // Used in ItemDetailsPanel
  const expandNode = useCallback(async (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => {
    setLoading(true);
    setError(null);

    try {
      // Use the new getExpandedGraph API instead of separate calls
      const includeIncoming = direction === 'incoming' || direction === 'both';
      const includeOutgoing = direction === 'outgoing' || direction === 'both';
      
      const expandedGraph = await api.getExpandedGraph(
        itemId, 
        includeIncoming, 
        includeOutgoing
      );

      const newNodes: GraphNode[] = [];
      const newLinks: GraphLink[] = [];

      // Process nodes from expanded graph
      expandedGraph.nodes.forEach(nodeData => {
        const nodeId = nodeData.item.id;
        
        // Skip if node already exists in graph
        if (state.accumulatedGraph.nodes.has(nodeId)) {
          return;
        }

        // Find relationships that connect to this node to get clusters
        const nodeRelationships = expandedGraph.relationships.filter(rel => 
          rel.from_id === nodeId || rel.to_id === nodeId
        );
        
        // Extract clusters from relationships
        const clusters = nodeRelationships
          .flatMap(rel => rel.clusters || [])
          .filter(Boolean);

        newNodes.push({
          id: nodeId,
          name: nodeData.item.name,
          type: nodeData.item.auto_detected_type || 'unknown',
          year: nodeData.item.year,
          category: nodeData.is_center ? 'main' : 'influence',
          clusters: clusters,
          description: nodeData.item.description
        });
      });

      // Process relationships from expanded graph
      expandedGraph.relationships.forEach(relationship => {
        const linkId = `${relationship.from_id}-${relationship.to_id}`;
        
        // Skip if relationship already exists
        if (state.accumulatedGraph.relationships.has(linkId)) {
          return;
        }

        newLinks.push({
          source: relationship.from_id,
          target: relationship.to_id,
          confidence: relationship.confidence,
          influence_type: relationship.influence_type,
          category: relationship.category,
          explanation: relationship.explanation
        });
      });

      if (newNodes.length > 0 || newLinks.length > 0) {
        addNodesAndLinks(newNodes, newLinks);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand graph');
    } finally {
      setLoading(false);
    }
  }, [state.accumulatedGraph, addNodesAndLinks, setLoading, setError]);
  
  // Used in ProposalAction
  const loadItemWithAccumulation = useCallback(async (itemId: string, itemName: string) => {
    try {
      setLoading(true);
      
      // Check if item already exists in current graph by ID first, then by name
      const existingItemId = checkIfItemExistsInGraph(itemId, itemName);
      const shouldPreserveLayout = existingItemId !== null;
      
      const response = await api.getInfluences(itemId);
      
      // Use the existing utility function to convert API response to graph format
      const { nodes, relationships } = extractNodesAndRelationships(response, state.accumulatedGraph);
      
      // Convert Maps to arrays for the context
      const nodeArray = Array.from(nodes.values());
      const linkArray = Array.from(relationships.values());

      if (shouldPreserveLayout) {
        // Accumulate with position preservation - just add new nodes/links
        addNodesAndLinks(nodeArray, linkArray);
        // Trigger layout recalculation to ensure optimal positioning
        triggerLayoutRecalculation();
      } else {
        // Normal load - clear and set new data
        clearGraph();
        addNodesAndLinks(nodeArray, linkArray);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  }, [checkIfItemExistsInGraph, setLoading, setError, state.accumulatedGraph, addNodesAndLinks, clearGraph, triggerLayoutRecalculation]);

  // Used in MainLayout for topbar searches - always clear graph first
  const loadItemInfluencesFromTopbar = useCallback(async (itemId: string) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await api.getInfluences(itemId);
      
      // Always clear the graph for topbar searches
      clearGraph();
  
      // Use your existing utility function to convert API response to graph format
      const { nodes, relationships } = extractNodesAndRelationships(response, state.accumulatedGraph);
      
      // Convert Maps to arrays for the context
      const nodeArray = Array.from(nodes.values());
      const linkArray = Array.from(relationships.values());
  
      addNodesAndLinks(nodeArray, linkArray);
      // Note: We don't call selectNode here - the item details panel should only open when a node is explicitly clicked
  
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load influences');
    } finally {
      setLoading(false);
    }
  }, [addNodesAndLinks, setLoading, setError, clearGraph]);

  return {
    loadItemInfluences,
    loadItemInfluencesWithoutSelection,
    expandNode,
    searchAndLoadItem,
    loadItemWithAccumulation,
    checkIfItemExistsInGraph,
    loadItemInfluencesFromTopbar,
    triggerLayoutRecalculation,
  };
};
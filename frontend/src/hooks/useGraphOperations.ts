import { useCallback } from 'react';
import { api } from '../services/api';
import { useGraph } from '../contexts/GraphContext';
import { extractNodesAndRelationships, generateClustersFromCategory } from '../utils/graphUtils';
import type { GraphNode, GraphLink } from '../types/graph';

export const useGraphOperations = () => {
  const { state: graphData, dispatch: graphDispatch } = useGraph();
  const { state, selectNode, addNodesAndLinks, setLoading, setError, clearGraph } = useGraph();

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

  const expandNode = useCallback(async (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => {
    setLoading(true);
    setError(null);

    try {
      const promises = [];
      
      if (direction === 'incoming' || direction === 'both') {
        promises.push(api.getInfluences(itemId));
      }
      
      if (direction === 'outgoing' || direction === 'both') {
        promises.push(api.getOutgoingInfluences(itemId));
      }

      const responses = await Promise.all(promises);
      const newNodes: GraphNode[] = [];
      const newLinks: GraphLink[] = [];

      // Debug: Check the structure of responses
      responses.forEach(response => {
        if ('influences' in response) {
          console.log('🔍 Full expansion influence object:', response.influences[0]);
          response.influences.forEach(influence => {
            console.log('🔍 Expansion influence keys:', Object.keys(influence));
            console.log('🔍 Expansion influence category:', influence.category);
          });
        }
      });

      responses.forEach(response => {
        if ('influences' in response) {
          // Incoming influences response
          response.influences.forEach(influence => {
            // For incoming influences:
            if (!state.accumulatedGraph.nodes.has(influence.from_item.id)) {
              // Generate clusters from category (same logic as initial load)
              const clusters = influence.clusters || generateClustersFromCategory(influence.category);
              
              newNodes.push({
                id: influence.from_item.id,
                name: influence.from_item.name,
                type: influence.from_item.auto_detected_type || 'unknown',
                year: influence.from_item.year,
                category: 'influence',
                clusters: clusters
              });

              console.log(`🔧 Generated clusters for ${influence.from_item.name}: ${clusters}`);
            }

            // Add link
            const linkId = `${influence.from_item.id}-${influence.to_item.id}`;
            if (!state.accumulatedGraph.relationships.has(linkId)) {
              newLinks.push({
                source: influence.from_item.id,
                target: influence.to_item.id,
                confidence: influence.confidence,
                influence_type: influence.influence_type,
                category: influence.category,
                explanation: influence.explanation
              });
            }
          });
        } else if ('outgoing_influences' in response) {
          // Outgoing influences response
          response.outgoing_influences.forEach(influence => {
            // For outgoing influences:
            if (!state.accumulatedGraph.nodes.has(influence.to_item.id)) {
              // Generate clusters from category (same logic as initial load)
              const clusters = influence.clusters || generateClustersFromCategory(influence.category);
              
              newNodes.push({
                id: influence.to_item.id,
                name: influence.to_item.name,
                type: influence.to_item.auto_detected_type || 'unknown',
                year: influence.to_item.year,
                category: 'influence',
                clusters: clusters
              });

              console.log(`🔧 Generated clusters for ${influence.to_item.name}: ${clusters}`);
            }

            // Add link
            const linkId = `${influence.from_item.id}-${influence.to_item.id}`;
            if (!state.accumulatedGraph.relationships.has(linkId)) {
              newLinks.push({
                source: influence.from_item.id,
                target: influence.to_item.id,
                confidence: influence.confidence,
                influence_type: influence.influence_type,
                category: influence.category,
                explanation: influence.explanation
              });
            }
          });
        }
      });

      console.log('🔄 New nodes from expansion:', newNodes.map(n => ({ 
        name: n.name, 
        category: n.category, 
        clusters: n.clusters,
        x: n.x,
        y: n.y
      })));

      if (newNodes.length > 0 || newLinks.length > 0) {
        addNodesAndLinks(newNodes, newLinks);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expand graph');
    } finally {
      setLoading(false);
    }
  }, [state.accumulatedGraph, addNodesAndLinks, setLoading, setError]);

  const searchAndLoadItem = useCallback(async (query: string) => {
    try {
      const items = await api.searchItems(query);
      return items;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      return [];
    }
  }, [setError]);

  const checkIfItemExistsInGraph = useCallback((itemName: string): string | null => {
    if (!graphData?.data) return null;
    
    // Check main item
    if (graphData.data.main_item.name.toLowerCase() === itemName.toLowerCase()) {
      return graphData.data.main_item.id;
    }
    
    // Check influences
    for (const influence of graphData.data.influences) {
      if (influence.from_item.name.toLowerCase() === itemName.toLowerCase()) {
        return influence.from_item.id;
      }
    }
    
    return null;
  }, [graphData]);

  const loadItemWithAccumulation = useCallback(async (itemId: string, itemName: string) => {
    try {
      graphDispatch({ type: 'SET_LOADING', payload: true });
      
      // Check if item already exists in current graph
      const existingItemId = checkIfItemExistsInGraph(itemName);
      const shouldPreserveLayout = existingItemId !== null;
      
      if (shouldPreserveLayout) {
        console.log(`Item "${itemName}" already exists in graph, preserving layout`);
        // Mark this node as expanded for visual indication
        graphDispatch({ type: 'MARK_NODE_EXPANDED', payload: existingItemId });
      }
      
      const response = await api.getInfluences(itemId);
      
      if (shouldPreserveLayout) {
        // Accumulate with position preservation
        graphDispatch({ 
          type: 'ACCUMULATE_GRAPH', 
          payload: { graphData: response, preservePositions: true }
        });
      } else {
        // Normal load
        graphDispatch({ type: 'SET_DATA', payload: response });
      }
      
    } catch (err) {
      graphDispatch({ 
        type: 'SET_ERROR', 
        payload: err instanceof Error ? err.message : 'Failed to load item'
      });
    }
  }, [checkIfItemExistsInGraph, graphDispatch]);

  return {
    loadItemInfluences,
    expandNode,
    searchAndLoadItem,
    loadItemWithAccumulation,
    checkIfItemExistsInGraph,
  };
};
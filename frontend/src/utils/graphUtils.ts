import type { GraphResponse } from '../services/api';
import type { GraphNode, GraphLink, AccumulatedGraph } from '../types/graph';

export const extractNodesAndRelationships = (graphResponse: GraphResponse) => {
  const nodes = new Map<string, GraphNode>();
  const relationships = new Map<string, GraphLink>();

  // Add main item
  nodes.set(graphResponse.main_item.id, {
    id: graphResponse.main_item.id,
    name: graphResponse.main_item.name,
    type: graphResponse.main_item.auto_detected_type || 'unknown',
    year: graphResponse.main_item.year,
    category: 'main'
  });

  // Add influence items and relationships
  graphResponse.influences.forEach(influence => {
    const influenceId = influence.from_item.id;
    const relationshipId = `${influenceId}->${graphResponse.main_item.id}`;

    // Add influence node (if not already exists)
    if (!nodes.has(influenceId)) {
      nodes.set(influenceId, {
        id: influenceId,
        name: influence.from_item.name,
        type: influence.from_item.auto_detected_type || 'unknown',
        year: influence.from_item.year,
        category: 'influence'
      });
    }

    // Add relationship
    relationships.set(relationshipId, {
      source: influenceId,
      target: graphResponse.main_item.id,
      confidence: influence.confidence,
      influence_type: influence.influence_type,
      explanation: influence.explanation,
      category: influence.category
    });
  });

  return { nodes, relationships };
};

export const mergeExpandedGraphData = (
  existingGraph: AccumulatedGraph,
  expandedGraph: any,
  centerItemId: string
): AccumulatedGraph => {
  const newNodes = new Map(existingGraph.nodes);
  const newRelationships = new Map(existingGraph.relationships);

  // Add all nodes from expanded graph
  expandedGraph.nodes.forEach((nodeData: any) => {
    const existingNode = newNodes.get(nodeData.item.id);
    
    newNodes.set(nodeData.item.id, {
      id: nodeData.item.id,
      name: nodeData.item.name,
      type: nodeData.item.auto_detected_type || 'unknown',
      year: nodeData.item.year,
      category: existingNode?.category || 'influence', // Preserve existing category
      x: existingNode?.x, // Preserve existing position
      y: existingNode?.y
    });
  });

  // Add all relationships from expanded graph
  expandedGraph.relationships.forEach((rel: any) => {
    const relationshipId = `${rel.from_id}->${rel.to_id}`;
    newRelationships.set(relationshipId, {
      source: rel.from_id,
      target: rel.to_id,
      confidence: rel.confidence,
      influence_type: rel.influence_type,
      explanation: rel.explanation,
      category: rel.category
    });
  });

  return {
    nodes: newNodes,
    relationships: newRelationships,
    selectedNodeId: centerItemId,
    expandedNodeIds: new Set([...existingGraph.expandedNodeIds, centerItemId])
  };
};

export const findConnectedNodes = (
  targetNode: GraphNode, 
  allNodes: GraphNode[], 
  allLinks: GraphLink[]
): GraphNode[] => {
  const connectedNodeIds = new Set<string>();
  
  allLinks.forEach(link => {
    if (link.source === targetNode.id) {
      connectedNodeIds.add(link.target);
    } else if (link.target === targetNode.id) {
      connectedNodeIds.add(link.source);
    }
  });
  
  return allNodes.filter(node => connectedNodeIds.has(node.id));
};

export const positionNewNodes = (
  existingNodes: GraphNode[], 
  newNodes: GraphNode[], 
  allLinks: GraphLink[],
  width: number,
  height: number
) => {
  newNodes.forEach(newNode => {
    if (newNode.x && newNode.y) return; // Already positioned
    
    const connectedNodes = findConnectedNodes(newNode, existingNodes, allLinks);
    
    if (connectedNodes.length > 0) {
      // Position near connected nodes
      const avgX = connectedNodes.reduce((sum, n) => sum + (n.x || 0), 0) / connectedNodes.length;
      const avgY = connectedNodes.reduce((sum, n) => sum + (n.y || 0), 0) / connectedNodes.length;
      
      // Add offset to avoid overlapping
      const angle = Math.random() * 2 * Math.PI;
      const distance = 120; // Distance from connected nodes
      
      newNode.x = avgX + Math.cos(angle) * distance;
      newNode.y = avgY + Math.sin(angle) * distance;
      
      // Keep within bounds
      newNode.x = Math.max(60, Math.min(width - 60, newNode.x));
      newNode.y = Math.max(60, Math.min(height - 60, newNode.y));
    } else {
      // No connections: place in empty area
      newNode.x = 100 + Math.random() * (width - 200);
      newNode.y = 100 + Math.random() * (height - 200);
    }
  });
};
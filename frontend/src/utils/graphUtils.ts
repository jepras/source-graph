import type { GraphResponse } from '../services/api';
import type { GraphNode, GraphLink, AccumulatedGraph } from '../types/graph';

// ============================================================================
// CORE GRAPH DATA EXTRACTION & TRANSFORMATION
// ============================================================================

export const extractNodesAndRelationships = (
  graphResponse: GraphResponse,
  existingGraph?: AccumulatedGraph
) => {
  const nodes = new Map<string, GraphNode>();
  const relationships = new Map<string, GraphLink>();

  // Check if main item already exists
  const existingMainNode = existingGraph?.nodes.get(graphResponse.main_item.id);
  const mainNodeCategory = existingMainNode ? existingMainNode.category : 'main';
  const mainNodeClusters = existingMainNode?.clusters || [];

  // Add main item with preserved category
  nodes.set(graphResponse.main_item.id, {
    id: graphResponse.main_item.id,
    name: graphResponse.main_item.name,
    type: graphResponse.main_item.auto_detected_type || 'unknown',
    year: graphResponse.main_item.year,
    category: mainNodeCategory,
    clusters: mainNodeClusters,
    x: existingMainNode?.x,
    y: existingMainNode?.y
  });

  // Add influence items and relationships
  graphResponse.influences.forEach((influence, index) => {
    const influenceId = influence.from_item.id;
    const relationshipId = `${influenceId}->${graphResponse.main_item.id}`;

    // Add influence node (if not already exists)
    if (!nodes.has(influenceId)) {
      // Try to use actual cluster data from API first
      let clusters: string[] = [];
      
      if (influence.clusters && influence.clusters.length > 0) {
        // Use real cluster data from API
        clusters = influence.clusters;
      } else {
        // Fallback: Generate meaningful test clusters based on category
        if (influence.category?.toLowerCase().includes('musical')) {
          if (influence.category.toLowerCase().includes('technique') || 
              influence.category.toLowerCase().includes('element')) {
            clusters = ['Musical Composition'];
          } else if (influence.category.toLowerCase().includes('tradition') || 
                     influence.category.toLowerCase().includes('movement')) {
            clusters = ['Musical Foundation'];
          } else {
            clusters = ['Musical Composition'];
          }
        } else if (influence.category?.toLowerCase().includes('visual') || 
                   influence.category?.toLowerCase().includes('cultural')) {
          clusters = ['Cultural Context'];
        } else if (influence.category?.toLowerCase().includes('song')) {
          clusters = ['Musical Composition'];
        } else {
          // Use category name as cluster if nothing else matches
          clusters = [influence.category || `Cluster ${index % 3 + 1}`];
        }
      }

      nodes.set(influenceId, {
        id: influenceId,
        name: influence.from_item.name,
        type: influence.from_item.auto_detected_type || 'unknown',
        year: influence.from_item.year,
        category: 'influence',
        clusters: clusters
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

// Might be redundand?
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
      category: existingNode?.category || 'influence',
      x: existingNode?.x,
      y: existingNode?.y,
      clusters: nodeData.clusters || existingNode?.clusters || []
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

export const checkGraphOverlap = (
  newGraphResponse: GraphResponse,
  existingGraph: AccumulatedGraph
): boolean => {
  const existingNodeIds = new Set(existingGraph.nodes.keys());
  
  if (existingNodeIds.has(newGraphResponse.main_item.id)) {
    return true;
  }
  
  const hasOverlappingInfluences = newGraphResponse.influences.some(influence => 
    existingNodeIds.has(influence.from_item.id) || 
    existingNodeIds.has(influence.to_item.id)
  );
  
  if (hasOverlappingInfluences) {
    return true;
  }
  
  return false;
};

// ============================================================================
// CLUSTER & CATEGORY MANAGEMENT
// ============================================================================

export const generateClustersFromCategory = (category: string): string[] => {
  if (category?.toLowerCase().includes('musical') || category?.toLowerCase().includes('music')) {
    return ['Music Albums'];
  } else if (category?.toLowerCase().includes('visual') || category?.toLowerCase().includes('design')) {
    return ['Cultural Context'];
  } else if (category?.toLowerCase().includes('renaissance')) {
    if (category.toLowerCase().includes('art')) return ['Renaissance Art'];
    if (category.toLowerCase().includes('literature')) return ['Renaissance Literature'];
    if (category.toLowerCase().includes('science')) return ['Renaissance Science'];
    return ['Renaissance'];
  } else if (category?.toLowerCase().includes('technological')) {
    return ['Technological Advancements'];
  } else if (category?.toLowerCase().includes('cultural')) {
    return ['Cultural Context'];
  }
  return ['Other'];
};

// Redundant?
export const extractCategories = (nodes: GraphNode[]) => {
  const categories = new Map<string, number>();
  
  nodes.forEach(node => {
    const type = node.type || 'unknown';
    categories.set(type, (categories.get(type) || 0) + 1);
  });

  return Array.from(categories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
};

// ============================================================================
// NODE POSITIONING & LAYOUT ALGORITHMS
// ============================================================================

const wouldOverlap = (
  x: number,
  y: number,
  existingNodes: GraphNode[],
  minDistance: number = 120
): boolean => {
  return existingNodes.some(node => {
    if (!node.x || !node.y) return false;
    const dx = node.x - x;
    const dy = node.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
  });
};

// redundant? 
export const positionNewNodes = (
  existingNodes: GraphNode[], 
  newNodes: GraphNode[], 
  allLinks: GraphLink[],
  width: number,
  height: number,
  forceChronological: boolean = false
) => {
  if (forceChronological) {
    positionNodesChronologically([...existingNodes, ...newNodes], width, height);
    return;
  }
  
  const MIN_NODE_DISTANCE = 120;
  
  const mainNode = existingNodes.find(node => node.category === 'main');
  
  if (!mainNode || !mainNode.x || !mainNode.y) {
    return;
  }
  
  const mainNodeX = mainNode.x;
  const mainNodeY = mainNode.y;
  
  const allPositionedNodes = [
    ...existingNodes, 
    ...newNodes.filter(n => n.x && n.y)
  ];
  
  newNodes.forEach((newNode, index) => {
    if (newNode.x && newNode.y) return;
    
    const totalNewNodes = newNodes.filter(n => !n.x || !n.y).length;
    const angleStep = (2 * Math.PI) / Math.max(totalNewNodes, 8);
    const baseAngle = index * angleStep;
    
    let positioned = false;
    
    for (let distanceMultiplier = 1.5; distanceMultiplier <= 4; distanceMultiplier += 0.5) {
      const distance = MIN_NODE_DISTANCE * distanceMultiplier;
      
      const angles = [
        baseAngle,
        baseAngle + angleStep * 0.25,
        baseAngle - angleStep * 0.25,
        baseAngle + angleStep * 0.5,
        baseAngle - angleStep * 0.5
      ];
      
      for (const angle of angles) {
        const x = mainNodeX + Math.cos(angle) * distance;
        const y = mainNodeY + Math.sin(angle) * distance;
        
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
        
        if (!wouldOverlap(x, y, allPositionedNodes, MIN_NODE_DISTANCE)) {
          newNode.x = x;
          newNode.y = y;
          allPositionedNodes.push(newNode);
          positioned = true;
          break;
        }
      }
      
      if (positioned) break;
    }
    
    if (!positioned) {
      let attempts = 0;
      while (attempts < 50) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = MIN_NODE_DISTANCE * (2 + Math.random() * 3);
        const x = mainNodeX + Math.cos(angle) * distance;
        const y = mainNodeY + Math.sin(angle) * distance;
        
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) {
          attempts++;
          continue;
        }
        
        if (!wouldOverlap(x, y, allPositionedNodes, MIN_NODE_DISTANCE)) {
          newNode.x = x;
          newNode.y = y;
          allPositionedNodes.push(newNode);
          break;
        }
        attempts++;
      }
      
      if (!newNode.x || !newNode.y) {
        const fallbackAngle = index * angleStep;
        const fallbackDistance = MIN_NODE_DISTANCE * (3 + index * 0.5);
        newNode.x = Math.max(60, Math.min(width - 60, mainNodeX + Math.cos(fallbackAngle) * fallbackDistance));
        newNode.y = Math.max(60, Math.min(height - 60, mainNodeY + Math.sin(fallbackAngle) * fallbackDistance));
      }
    }
  });
};

// redundant?
export const positionNodesChronologically = (
  nodes: GraphNode[], 
  width: number, 
  height: number
) => {
  // Filter nodes with years and sort them
  const nodesWithYears = nodes.filter(node => node.year !== undefined);
  const nodesWithoutYears = nodes.filter(node => node.year === undefined);
  
  // Sort by year (newest first)
  nodesWithYears.sort((a, b) => (b.year || 0) - (a.year || 0));
  
  const padding = 80;
  const availableHeight = height - (2 * padding);
  
  // Position nodes with years vertically by chronology
  nodesWithYears.forEach((node, index) => {
    const yPosition = padding + (index / Math.max(nodesWithYears.length - 1, 1)) * availableHeight;
    
    // Spread horizontally with some variation
    const baseX = width / 2;
    const horizontalSpread = Math.min(300, width * 0.3);
    const xOffset = (index % 2 === 0 ? 1 : -1) * (horizontalSpread * Math.random() * 0.5);
    
    node.x = Math.max(padding, Math.min(width - padding, baseX + xOffset));
    node.y = yPosition;
  });
  
  // Position nodes without years at the bottom
  nodesWithoutYears.forEach((node, index) => {
    const yPosition = height - padding - 50;
    const spacing = Math.min(120, (width - 2 * padding) / Math.max(nodesWithoutYears.length, 1));
    
    node.x = padding + index * spacing;
    node.y = yPosition;
  });
};

// Add this function to frontend/src/utils/graphUtils.ts

export const positionNodesCategorically = (
  nodes: GraphNode[], 
  width: number, 
  height: number,
  chronological: boolean = false
) => {
  // Group nodes by auto_detected_type
  const categories = new Map<string, GraphNode[]>();
  
  nodes.forEach(node => {
    const type = node.type || 'unknown';
    if (!categories.has(type)) {
      categories.set(type, []);
    }
    categories.get(type)!.push(node);
  });

  // Sort categories by node count (descending)
  const sortedCategories = Array.from(categories.entries())
    .sort((a, b) => b[1].length - a[1].length);

  const padding = 80;
  const availableWidth = width - (2 * padding);
  const availableHeight = height - (2 * padding);

  // Calculate column widths based on node count
  const totalNodes = nodes.length;
  let currentX = padding;

  if (chronological) {
    // GLOBAL CHRONOLOGICAL POSITIONING WITH COLLISION AVOIDANCE
    const nodesWithYears = nodes.filter(n => n.year !== undefined);
    const nodesWithoutYears = nodes.filter(n => n.year === undefined);
    
    if (nodesWithYears.length > 0) {
      const minYear = Math.min(...nodesWithYears.map(n => n.year!));
      const maxYear = Math.max(...nodesWithYears.map(n => n.year!));
      const yearRange = Math.max(maxYear - minYear, 1);
      
      const NODE_HEIGHT = 60;
      const COLUMN_PADDING = 20;
      
      // Position each category column
      sortedCategories.forEach(([categoryType, categoryNodes]) => {
        const proportion = categoryNodes.length / totalNodes;
        const minColumnWidth = 150;
        const columnWidth = Math.max(minColumnWidth, availableWidth * proportion);
        
        // Sort nodes in this category by year (newest first)
        const sortedNodes = categoryNodes
          .filter(n => n.year !== undefined)
          .sort((a, b) => (b.year || 0) - (a.year || 0));
        
        const nodesWithoutYearInCategory = categoryNodes.filter(n => n.year === undefined);
        
        // Track occupied Y positions in this column to avoid overlaps
        const occupiedPositions: { y: number; nodeId: string }[] = [];
        
        sortedNodes.forEach((node, index) => {
          // Calculate ideal Y position based on year
          const yearProgress = (maxYear - node.year!) / yearRange;
          let idealY = padding + (yearProgress * availableHeight * 0.8);
          
          // Find actual Y position that doesn't overlap
          let actualY = idealY;
          let attempts = 0;
          
          while (attempts < 50) {
            const hasOverlap = occupiedPositions.some(pos => 
              Math.abs(pos.y - actualY) < NODE_HEIGHT
            );
            
            if (!hasOverlap) {
              break;
            }
            
            // Try positions around the ideal Y
            if (attempts % 2 === 0) {
              actualY = idealY + (Math.ceil(attempts / 2) * NODE_HEIGHT);
            } else {
              actualY = idealY - (Math.ceil(attempts / 2) * NODE_HEIGHT);
            }
            
            attempts++;
          }
          
          // Ensure position is within bounds
          actualY = Math.max(padding, Math.min(height - padding - 50, actualY));
          
          const xOffset = (Math.random() - 0.5) * (columnWidth * 0.3);
          node.x = Math.max(currentX + COLUMN_PADDING, Math.min(currentX + columnWidth - COLUMN_PADDING, currentX + columnWidth/2 + xOffset));
          node.y = actualY;
          
          // Record this position as occupied
          occupiedPositions.push({ y: actualY, nodeId: node.id });
        });
        
        // Position nodes without years at bottom
        nodesWithoutYearInCategory.forEach((node, index) => {
          const xOffset = (Math.random() - 0.5) * (columnWidth * 0.3);
          node.x = Math.max(currentX + COLUMN_PADDING, Math.min(currentX + columnWidth - COLUMN_PADDING, currentX + columnWidth/2 + xOffset));
          node.y = height - padding - 50 - (index * NODE_HEIGHT);
        });
        
        currentX += columnWidth;
      });
    } else {
      positionNodesCategoricallyNonChronological(sortedCategories, currentX, availableWidth, availableHeight, totalNodes, padding, height);
    }
  }
};

// Helper function for non-chronological positioning
const positionNodesCategoricallyNonChronological = (
  sortedCategories: [string, GraphNode[]][],
  startX: number,
  availableWidth: number,
  availableHeight: number,
  totalNodes: number,
  padding: number,
  height: number
) => {
  let currentX = startX;
  
  sortedCategories.forEach(([categoryType, categoryNodes]) => {
    const proportion = categoryNodes.length / totalNodes;
    const minColumnWidth = 150;
    const columnWidth = Math.max(minColumnWidth, availableWidth * proportion);
    
    // Distribute evenly in column
    categoryNodes.forEach((node, index) => {
      const yPosition = padding + (index / Math.max(categoryNodes.length - 1, 1)) * availableHeight;
      const xOffset = (Math.random() - 0.5) * (columnWidth * 0.4);
      
      node.x = Math.max(currentX + 20, Math.min(currentX + columnWidth - 20, currentX + columnWidth/2 + xOffset));
      node.y = yPosition;
    });
    
    currentX += columnWidth;
  });
};

// ============================================================================
// CONNECTION & RELATIONSHIP UTILITIES
// ============================================================================

// redundant? 
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
  
  const result = allNodes.filter(node => 
    connectedNodeIds.has(node.id) && 
    node.id !== targetNode.id &&
    node.x !== undefined && 
    node.y !== undefined
  );
  
  return result;
};

// ============================================================================
// ADVANCED POSITIONING ALGORITHMS
// ============================================================================

const findPositionUsingForces = (
  preferredX: number,
  preferredY: number,
  existingNodes: GraphNode[],
  width: number,
  height: number,
  minDistance: number
): { x: number; y: number } => {
  let x = preferredX;
  let y = preferredY;
  
  for (let iteration = 0; iteration < 50; iteration++) {
    let forceX = 0;
    let forceY = 0;
    
    existingNodes.forEach(node => {
      if (!node.x || !node.y) return;
      
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance && distance > 0) {
        const force = (minDistance - distance) / distance;
        forceX += dx * force * 0.1;
        forceY += dy * force * 0.1;
      }
    });
    
    x += forceX;
    y += forceY;
    
    x = Math.max(80, Math.min(width - 80, x));
    y = Math.max(80, Math.min(height - 80, y));
    
    if (!wouldOverlap(x, y, existingNodes, minDistance)) {
      break;
    }
  }
  
  return { x, y };
};

const findPositionNearConnections = (
  connectedNodes: GraphNode[],
  allPositionedNodes: GraphNode[],
  width: number,
  height: number,
  minDistance: number
): { x: number; y: number } => {
  
  if (connectedNodes.length === 0) {
    return { x: width / 2, y: height / 2 };
  }
  
  if (connectedNodes.length === 1) {
    const connected = connectedNodes[0];
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2, Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
    
    for (const angle of angles) {
      const distance = minDistance * 1.5;
      const x = (connected.x || 0) + Math.cos(angle) * distance;
      const y = (connected.y || 0) + Math.sin(angle) * distance;
      
      if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
      
      if (!wouldOverlap(x, y, allPositionedNodes, minDistance)) {
        return { x, y };
      }
    }
  }
  
  const avgX = connectedNodes.reduce((sum, n) => sum + (n.x || 0), 0) / connectedNodes.length;
  const avgY = connectedNodes.reduce((sum, n) => sum + (n.y || 0), 0) / connectedNodes.length;
  
  for (let radius = minDistance * 1.2; radius < Math.min(width, height) / 2; radius += minDistance * 0.5) {
    const numAttempts = Math.max(8, Math.floor(2 * Math.PI * radius / (minDistance * 0.8)));
    
    for (let i = 0; i < numAttempts; i++) {
      const angle = (2 * Math.PI * i) / numAttempts;
      const x = avgX + Math.cos(angle) * radius;
      const y = avgY + Math.sin(angle) * radius;
      
      if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
      
      if (!wouldOverlap(x, y, allPositionedNodes, minDistance)) {
        return { x, y };
      }
    }
  }
  
  return findPositionUsingForces(avgX, avgY, allPositionedNodes, width, height, minDistance);
};
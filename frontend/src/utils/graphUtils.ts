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
    console.log(`Finding connections for ${targetNode.id}`);
    
    const connectedNodeIds = new Set<string>();
    
    allLinks.forEach(link => {
      if (link.source === targetNode.id) {
        connectedNodeIds.add(link.target);
        console.log(`Found connection: ${targetNode.id} -> ${link.target}`);
      } else if (link.target === targetNode.id) {
        connectedNodeIds.add(link.source);
        console.log(`Found connection: ${link.source} -> ${targetNode.id}`);
      }
    });
    
    console.log('Connected node IDs:', Array.from(connectedNodeIds));
    
    const result = allNodes.filter(node => 
      connectedNodeIds.has(node.id) && 
      node.id !== targetNode.id && // Exclude self
      node.x !== undefined && 
      node.y !== undefined
    );
    
    console.log('Filtered connected nodes:', result.map(n => ({ id: n.id, x: n.x, y: n.y })));
    
    return result;
  };

// Helper function to check if a position would overlap with existing nodes
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
  
// Helper function to find a non-overlapping position using spiral search
// Improved positioning using grid-based search
const findNonOverlappingPosition = (
    centerX: number,
    centerY: number,
    existingNodes: GraphNode[],
    width: number,
    height: number,
    minDistance: number = 120
  ): { x: number; y: number } => {
    const gridSize = minDistance * 0.8; // Slightly smaller than min distance for efficiency
    const maxRadius = Math.min(width, height) / 2;
    
    // Try positions in expanding rings around the center
    for (let radius = gridSize; radius < maxRadius; radius += gridSize) {
      const circumference = 2 * Math.PI * radius;
      const numPositions = Math.max(8, Math.floor(circumference / gridSize));
      
      for (let i = 0; i < numPositions; i++) {
        const angle = (2 * Math.PI * i) / numPositions;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Check bounds
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) {
          continue;
        }
        
        if (!wouldOverlap(x, y, existingNodes, minDistance)) {
          return { x, y };
        }
      }
    }
    
    // If still no position found, use force-based positioning
    return findPositionUsingForces(centerX, centerY, existingNodes, width, height, minDistance);
  };

// Helper function to position a node randomly without overlaps
const positionNodeRandomly = (
    node: GraphNode,
    existingNodes: GraphNode[],
    width: number,
    height: number,
    minDistance: number,
    maxAttempts: number = 100
  ) => {
    let positioned = false;
    let attempts = 0;
    
    while (!positioned && attempts < maxAttempts) {
      const x = 60 + Math.random() * (width - 120);
      const y = 60 + Math.random() * (height - 120);
      
      if (!wouldOverlap(x, y, existingNodes, minDistance)) {
        node.x = x;
        node.y = y;
        positioned = true;
      }
      attempts++;
    }
    
    // If still not positioned after max attempts, place it anyway but try to minimize overlap
    if (!positioned) {
      node.x = 60 + Math.random() * (width - 120);
      node.y = 60 + Math.random() * (height - 120);
    }
  };

// Calculate density map of the graph area
const calculateDensityMap = (
    nodes: GraphNode[],
    width: number,
    height: number,
    minDistance: number
  ): number[][] => {
    const gridSize = minDistance;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    
    const densityMap: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));
    
    nodes.forEach(node => {
      if (!node.x || !node.y) return;
      
      const col = Math.floor(node.x / gridSize);
      const row = Math.floor(node.y / gridSize);
      
      // Increase density in surrounding cells
      for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
          densityMap[r][c]++;
        }
      }
    });
    
    return densityMap;
  };
  
  // Find the least dense spot in the graph
  const findLeastDenseSpot = (
    densityMap: number[][],
    width: number,
    height: number
  ): { x: number; y: number } => {
    let minDensity = Infinity;
    let bestSpot = { x: width / 2, y: height / 2 };
    
    const gridSize = Math.min(width / densityMap[0].length, height / densityMap.length);
    
    for (let row = 0; row < densityMap.length; row++) {
      for (let col = 0; col < densityMap[row].length; col++) {
        if (densityMap[row][col] < minDensity) {
          minDensity = densityMap[row][col];
          bestSpot = {
            x: col * gridSize + gridSize / 2,
            y: row * gridSize + gridSize / 2
          };
        }
      }
    }
    
    return bestSpot;
  };

// Modified positionNewNodes function
export const positionNewNodes = (
    existingNodes: GraphNode[], 
    newNodes: GraphNode[], 
    allLinks: GraphLink[],
    width: number,
    height: number
  ) => {
    const MIN_NODE_DISTANCE = 120;
    
    // Find the main/selected node (the one being expanded)
    const mainNode = existingNodes.find(node => node.category === 'main');
    
    if (!mainNode || !mainNode.x || !mainNode.y) {
      console.error('Main node not found or not positioned');
      return;
    }
    
    console.log('Positioning new nodes around main node:', { id: mainNode.id, x: mainNode.x, y: mainNode.y });
    
    const allPositionedNodes = [
      ...existingNodes, 
      ...newNodes.filter(n => n.x && n.y)
    ];
    
    // Position new nodes in a circle around the main node
    newNodes.forEach((newNode, index) => {
      if (newNode.x && newNode.y) return; // Skip already positioned nodes
      
      const totalNewNodes = newNodes.filter(n => !n.x || !n.y).length;
      const angleStep = (2 * Math.PI) / Math.max(totalNewNodes, 8); // At least 8 positions
      const baseAngle = index * angleStep;
      
      // Try different distances until we find a non-overlapping position
      let positioned = false;
      
      for (let distanceMultiplier = 1.5; distanceMultiplier <= 4; distanceMultiplier += 0.5) {
        const distance = MIN_NODE_DISTANCE * distanceMultiplier;
        
        // Try the base angle and some variations
        const angles = [
          baseAngle,
          baseAngle + angleStep * 0.25,
          baseAngle - angleStep * 0.25,
          baseAngle + angleStep * 0.5,
          baseAngle - angleStep * 0.5
        ];
        
        for (const angle of angles) {
          const x = mainNode.x + Math.cos(angle) * distance;
          const y = mainNode.y + Math.sin(angle) * distance;
          
          // Check bounds
          if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
          
          // Check for overlaps
          if (!wouldOverlap(x, y, allPositionedNodes, MIN_NODE_DISTANCE)) {
            newNode.x = x;
            newNode.y = y;
            allPositionedNodes.push(newNode); // Add to positioned nodes for next iterations
            positioned = true;
            console.log(`Positioned ${newNode.id} at distance ${distance}, angle ${angle}:`, { x, y });
            break;
          }
        }
        
        if (positioned) break;
      }
      
      // Fallback: position randomly but away from main node
      if (!positioned) {
        let attempts = 0;
        while (attempts < 50) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = MIN_NODE_DISTANCE * (2 + Math.random() * 3); // Random distance 2-5x min distance
          const x = mainNode.x + Math.cos(angle) * distance;
          const y = mainNode.y + Math.sin(angle) * distance;
          
          // Check bounds
          if (x < 60 || x > width - 60 || y < 60 || y > height - 60) {
            attempts++;
            continue;
          }
          
          if (!wouldOverlap(x, y, allPositionedNodes, MIN_NODE_DISTANCE)) {
            newNode.x = x;
            newNode.y = y;
            allPositionedNodes.push(newNode);
            console.log(`Random positioned ${newNode.id}:`, { x, y });
            break;
          }
          attempts++;
        }
        
        // Ultimate fallback
        if (!newNode.x || !newNode.y) {
          const fallbackAngle = index * angleStep;
          const fallbackDistance = MIN_NODE_DISTANCE * (3 + index * 0.5);
          newNode.x = Math.max(60, Math.min(width - 60, mainNode.x + Math.cos(fallbackAngle) * fallbackDistance));
          newNode.y = Math.max(60, Math.min(height - 60, mainNode.y + Math.sin(fallbackAngle) * fallbackDistance));
          console.log(`Fallback positioned ${newNode.id}:`, { x: newNode.x, y: newNode.y });
        }
      }
    });
  };

  // Force-based positioning for very dense graphs
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
    
    // Apply repulsion forces from existing nodes
    for (let iteration = 0; iteration < 50; iteration++) {
      let forceX = 0;
      let forceY = 0;
      
      existingNodes.forEach(node => {
        if (!node.x || !node.y) return;
        
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance && distance > 0) {
          // Apply repulsion force
          const force = (minDistance - distance) / distance;
          forceX += dx * force * 0.1;
          forceY += dy * force * 0.1;
        }
      });
      
      // Apply forces
      x += forceX;
      y += forceY;
      
      // Keep within bounds with some padding
      x = Math.max(80, Math.min(width - 80, x));
      y = Math.max(80, Math.min(height - 80, y));
      
      // Check if position is now valid
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
      // No connections - use center as fallback
      return { x: width / 2, y: height / 2 };
    }
    
    if (connectedNodes.length === 1) {
      // Single connection - position in a circle around it
      const connected = connectedNodes[0];
      const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2, Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
      
      for (const angle of angles) {
        const distance = minDistance * 1.5;
        const x = (connected.x || 0) + Math.cos(angle) * distance;
        const y = (connected.y || 0) + Math.sin(angle) * distance;
        
        // Check bounds
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
        
        if (!wouldOverlap(x, y, allPositionedNodes, minDistance)) {
          return { x, y };
        }
      }
    }
    
    // Multiple connections - find best position around the centroid
    const avgX = connectedNodes.reduce((sum, n) => sum + (n.x || 0), 0) / connectedNodes.length;
    const avgY = connectedNodes.reduce((sum, n) => sum + (n.y || 0), 0) / connectedNodes.length;
    
    // Try positions in expanding circles around the average
    for (let radius = minDistance * 1.2; radius < Math.min(width, height) / 2; radius += minDistance * 0.5) {
      const numAttempts = Math.max(8, Math.floor(2 * Math.PI * radius / (minDistance * 0.8)));
      
      for (let i = 0; i < numAttempts; i++) {
        const angle = (2 * Math.PI * i) / numAttempts;
        const x = avgX + Math.cos(angle) * radius;
        const y = avgY + Math.sin(angle) * radius;
        
        // Check bounds
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
        
        if (!wouldOverlap(x, y, allPositionedNodes, minDistance)) {
          return { x, y };
        }
      }
    }
    
    // Fallback to force-based positioning
    return findPositionUsingForces(avgX, avgY, allPositionedNodes, width, height, minDistance);
  };
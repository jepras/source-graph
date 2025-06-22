import type { GraphResponse } from '../services/api';
import type { GraphNode, GraphLink, AccumulatedGraph } from '../types/graph';

// ============================================================================
// GRAPH POSITIONING LOGIC
// ============================================================================

export interface PositionConfig {
  isClusteringEnabled: boolean;
  isChronologicalOrder: boolean;
  width: number;
  height: number;
}

export const positionGraphNodes = (nodes: GraphNode[], config: PositionConfig) => {
  const { isClusteringEnabled, isChronologicalOrder, width, height } = config;

  if (isClusteringEnabled) {
    if (isChronologicalOrder) {
      positionClusterModeChronological(nodes, width, height);
    } else {
      positionClusterModeNatural(nodes, width, height);
    }
  } else {
    if (isChronologicalOrder) {
      positionDefaultModeChronological(nodes, width, height);
    } else {
      positionDefaultModeNatural(nodes, width, height);
    }
  }
};

export const extractNodesAndRelationships = (
  graphResponse: GraphResponse,
  existingGraph?: AccumulatedGraph
) => {
  const nodes = new Map<string, GraphNode>();
  const relationships = new Map<string, GraphLink>();

  // Check if main item already exists
  const existingMainNode = existingGraph?.nodes.get(graphResponse.main_item.id);
  const mainNodeCategory = existingMainNode ? existingMainNode.category : 'main';
  
  // For main item, derive clusters from its incoming influences
  const mainItemClusters = graphResponse.influences
    .flatMap(influence => influence.clusters || [])
    .filter(Boolean);

  // Add main item with derived clusters
  nodes.set(graphResponse.main_item.id, {
    id: graphResponse.main_item.id,
    name: graphResponse.main_item.name,
    type: graphResponse.main_item.auto_detected_type || 'unknown',
    year: graphResponse.main_item.year,
    category: mainNodeCategory,
    clusters: mainItemClusters, // ✅ Use derived clusters from relationships
    x: existingMainNode?.x,
    y: existingMainNode?.y
  });

  // Add influence items and relationships
  graphResponse.influences.forEach((influence) => {
    const influenceId = influence.from_item.id;
    const relationshipId = `${influenceId}->${graphResponse.main_item.id}`;

    // Add influence node (if not already exists)
    if (!nodes.has(influenceId)) {
      nodes.set(influenceId, {
        id: influenceId,
        name: influence.from_item.name,
        type: influence.from_item.auto_detected_type || 'unknown',
        year: influence.from_item.year,
        category: 'influence',
        clusters: influence.clusters || [] // ✅ Use relationship clusters
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

// 1. Cluster Mode + Chronological: Vertical columns, globally sorted by year
const positionClusterModeChronological = (nodes: GraphNode[], width: number, height: number) => {
  // Separate main items from influences
  const mainNodes = nodes.filter(n => n.category === 'main');
  const influenceNodes = nodes.filter(n => n.category === 'influence');
  
  const clusters = extractClusters(influenceNodes);
  if (clusters.length === 0) {
    positionDefaultModeChronological(nodes, width, height);
    return;
  }

  // Position main items at the top center
  mainNodes.forEach((node, index) => {
    const spacing = 200;
    const startX = (width / 2) - ((mainNodes.length - 1) * spacing / 2);
    node.x = startX + (index * spacing);
    node.y = 160; // CHANGED: Position underneath cluster text labels (which are at y=130)
  });

  // Sort ALL influence nodes globally by year (newest first)
  const nodesWithYears = influenceNodes.filter(n => n.year).sort((a, b) => (b.year || 0) - (a.year || 0));
  const nodesWithoutYears = influenceNodes.filter(n => !n.year);

  const padding = 80;
  const topPadding = 180; // CHANGED: Extra space for main items + cluster labels
  const availableWidth = width - (2 * padding);
  const columnWidth = availableWidth / clusters.length;
  const availableHeight = height - topPadding - padding; // CHANGED: Use topPadding

  // Assign global Y positions based on chronological order
  nodesWithYears.forEach((node, index) => {
    const yProgress = index / Math.max(nodesWithYears.length - 1, 1);
    node.y = topPadding + (yProgress * availableHeight * 0.8); // CHANGED: Use topPadding
  });

  // Position nodes without years at bottom
  nodesWithoutYears.forEach((node, index) => {
    node.y = height - padding - 50 - (index * 30);
  });

  // Rest of the function stays the same...
  clusters.forEach((clusterName, clusterIndex) => {
    const clusterCenterX = padding + (clusterIndex * columnWidth) + (columnWidth / 2);
    const clusterNodes = influenceNodes.filter(n => n.clusters?.includes(clusterName));
    
    const yearGroups = new Map<number, GraphNode[]>();
    clusterNodes.forEach(node => {
      const year = node.year || -1;
      if (!yearGroups.has(year)) yearGroups.set(year, []);
      yearGroups.get(year)!.push(node);
    });

    yearGroups.forEach(yearNodes => {
      yearNodes.forEach((node, nodeIndex) => {
        const totalInYear = yearNodes.length;
        const nodeSpacing = Math.min(80, columnWidth * 0.8 / Math.max(totalInYear, 1));
        const startX = clusterCenterX - ((totalInYear - 1) * nodeSpacing) / 2;
        node.x = startX + (nodeIndex * nodeSpacing);
      });
    });
  });
};

// 2. Cluster Mode + Natural: Vertical columns, natural spread within clusters
const positionClusterModeNatural = (nodes: GraphNode[], width: number, height: number) => {
  // Separate main items from influences
  const mainNodes = nodes.filter(n => n.category === 'main');
  const influenceNodes = nodes.filter(n => n.category === 'influence');
  
  const clusters = extractClusters(influenceNodes);
  if (clusters.length === 0) {
    positionDefaultModeNatural(nodes, width, height);
    return;
  }

  // Position main items at the top center
  mainNodes.forEach((node, index) => {
    const spacing = 200;
    const startX = (width / 2) - ((mainNodes.length - 1) * spacing / 2);
    node.x = startX + (index * spacing);
    node.y = 160; // CHANGED: Position underneath cluster text labels (which are at y=130)
  });

  const padding = 80;
  const topPadding = 180; // CHANGED: Extra space for main items + cluster labels
  const availableWidth = width - (2 * padding);
  const columnWidth = availableWidth / clusters.length;
  const availableHeight = height - topPadding - padding; // CHANGED: Use topPadding

  clusters.forEach((clusterName, clusterIndex) => {
    const clusterCenterX = padding + (clusterIndex * columnWidth) + (columnWidth / 2);
    const clusterNodes = influenceNodes.filter(n => n.clusters?.includes(clusterName));
    
    // Distribute nodes naturally within the cluster column
    clusterNodes.forEach((node, nodeIndex) => {
      const yProgress = nodeIndex / Math.max(clusterNodes.length - 1, 1);
      node.y = topPadding + (yProgress * availableHeight); // CHANGED: Use topPadding
      
      // Add some horizontal variation within the column
      const xVariation = (Math.random() - 0.5) * (columnWidth * 0.4);
      node.x = clusterCenterX + xVariation;
    });
  });
};

// 3. Default Mode + Chronological: Natural spread constrained by Y-axis chronology
const positionDefaultModeChronological = (nodes: GraphNode[], width: number, height: number) => {
  const nodesWithYears = nodes.filter(n => n.year).sort((a, b) => (b.year || 0) - (a.year || 0));
  const nodesWithoutYears = nodes.filter(n => !n.year);

  const padding = 80;
  const availableHeight = height - (2 * padding);

  // Assign Y positions based on chronology
  nodesWithYears.forEach((node, index) => {
    const yProgress = index / Math.max(nodesWithYears.length - 1, 1);
    node.y = padding + (yProgress * availableHeight * 0.8);
  });

  // Assign X positions with natural spread
  nodesWithYears.forEach((node, index) => {
    const xVariation = (Math.random() - 0.5) * (width * 0.6);
    node.x = (width / 2) + xVariation;
  });

  // Position nodes without years at bottom
  nodesWithoutYears.forEach((node, index) => {
    node.y = height - padding - 50;
    const spacing = Math.min(120, (width - 2 * padding) / Math.max(nodesWithoutYears.length, 1));
    node.x = padding + (index * spacing);
  });
};

// 4. Default Mode + Natural: Smart grid/radial avoiding overlaps
const positionDefaultModeNatural = (nodes: GraphNode[], width: number, height: number) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const minDistance = 120;

  nodes.forEach((node, index) => {
    let positioned = false;
    
    // Try positioning in expanding circles
    for (let radius = minDistance; radius < Math.min(width, height) / 2; radius += minDistance * 0.7) {
      const positions = Math.max(8, Math.floor(2 * Math.PI * radius / minDistance));
      
      for (let i = 0; i < positions; i++) {
        const angle = (2 * Math.PI * i) / positions + (index * 0.1); // Small offset per node
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Check bounds
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
        
        // Check for overlaps with already positioned nodes
        const hasOverlap = nodes.slice(0, index).some(other => {
          if (!other.x || !other.y) return false;
          const dx = other.x - x;
          const dy = other.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
        
        if (!hasOverlap) {
          node.x = x;
          node.y = y;
          positioned = true;
          break;
        }
      }
      
      if (positioned) break;
    }
    
    // Fallback positioning
    if (!positioned) {
      const fallbackAngle = (index / nodes.length) * 2 * Math.PI;
      const fallbackRadius = Math.min(width, height) / 3;
      node.x = centerX + Math.cos(fallbackAngle) * fallbackRadius;
      node.y = centerY + Math.sin(fallbackAngle) * fallbackRadius;
    }
  });
};


// Helper function to extract unique clusters
export const extractClusters = (nodes: GraphNode[]): string[] => {
  const clusterSet = new Set<string>();
  nodes.forEach(node => {
    if (node.clusters && Array.isArray(node.clusters)) {
      node.clusters.forEach(cluster => clusterSet.add(cluster));
    }
  });
  return Array.from(clusterSet);
};
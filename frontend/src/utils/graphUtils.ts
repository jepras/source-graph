import type { GraphResponse } from '../services/api';
import type { GraphNode, GraphLink, AccumulatedGraph, CustomCluster } from '../types/graph';

// ============================================================================
// GRAPH POSITIONING LOGIC
// ============================================================================

export interface PositionConfig {
  isClusteringEnabled: boolean;
  isChronologicalOrder: boolean;
  width: number;
  height: number;
  clusteringMode?: 'item' | 'custom';
  customClusters?: CustomCluster[];
}

export const positionGraphNodes = (nodes: GraphNode[], config: PositionConfig) => {
  const { isClusteringEnabled, isChronologicalOrder, width, height, clusteringMode, customClusters } = config;

  if (isClusteringEnabled) {
    if (isChronologicalOrder) {
      positionClusterModeChronological(nodes, width, height, clusteringMode, customClusters);
    } else {
      positionClusterModeNatural(nodes, width, height, clusteringMode, customClusters);
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

  const existingMainNode = existingGraph?.nodes.get(graphResponse.main_item.id);
  const mainNodeCategory = existingMainNode ? existingMainNode.category : 'main';
  
  const mainItemClusters = graphResponse.influences
    .flatMap(influence => influence.clusters || [])
    .filter(Boolean);

  nodes.set(graphResponse.main_item.id, {
    id: graphResponse.main_item.id,
    name: graphResponse.main_item.name,
    type: graphResponse.main_item.auto_detected_type || 'unknown',
    year: graphResponse.main_item.year,
    category: mainNodeCategory,
    clusters: ["Research Focus"],
    x: existingMainNode?.x,
    y: existingMainNode?.y,
    description: graphResponse.main_item.description
  });

  graphResponse.influences.forEach((influence) => {
    const influenceId = influence.from_item.id;
    const relationshipId = `${influenceId}->${graphResponse.main_item.id}`;

    if (!nodes.has(influenceId)) {
      nodes.set(influenceId, {
        id: influenceId,
        name: influence.from_item.name,
        type: influence.from_item.auto_detected_type || 'unknown',
        year: influence.from_item.year,
        category: 'influence',
        clusters: influence.clusters || [],
        description: influence.from_item.description
      });
    }

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

const positionClusterModeChronological = (nodes: GraphNode[], width: number, height: number, clusteringMode: 'item' | 'custom' = 'item', customClusters: CustomCluster[] = []) => {
  const clusters = clusteringMode === 'custom' && customClusters ? customClusters.map(c => c.name) : extractClusters(nodes);
  if (clusters.length === 0) {
    positionDefaultModeChronological(nodes, width, height);
    return;
  }

  const padding = 80;
  const topPadding = 180;
  const availableWidth = width - (2 * padding);
  const columnWidth = availableWidth / clusters.length;
  const availableHeight = height - topPadding - padding;

  const allNodesWithYears = nodes.filter(n => n.year).sort((a, b) => (b.year || 0) - (a.year || 0));
  const allNodesWithoutYears = nodes.filter(n => !n.year);

  allNodesWithYears.forEach((node, index) => {
    const yProgress = index / Math.max(allNodesWithYears.length - 1, 1);
    node.y = topPadding + (yProgress * availableHeight * 0.8);
  });

  allNodesWithoutYears.forEach((node, index) => {
    node.y = height - padding - 50 - (index * 30);
  });

  const reorderedClusters = clusteringMode === 'custom' && customClusters ? customClusters.map(c => c.name) : getReorderedClusters(nodes);

  reorderedClusters.forEach((clusterName, clusterIndex) => {
    const clusterCenterX = padding + (clusterIndex * columnWidth) + (columnWidth / 2);
    
    let clusterNodes: GraphNode[];
    if (clusteringMode === 'custom' && customClusters) {
        const cluster = customClusters.find(c => c.name === clusterName);
        const nodeIds = cluster ? cluster.nodeIds : [];
        clusterNodes = nodes.filter(n => nodeIds.includes(n.id));
    } else {
        const mainNodes = nodes.filter(n => n.category === 'main');
        const influenceNodes = nodes.filter(n => n.category === 'influence');
        if (clusterName === "Research Focus") {
            clusterNodes = mainNodes;
        } else {
            clusterNodes = influenceNodes.filter(n => n.clusters?.includes(clusterName));
        }
    }
    
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

const positionClusterModeNatural = (nodes: GraphNode[], width: number, height: number, clusteringMode: 'item' | 'custom' = 'item', customClusters: CustomCluster[] = []) => {
  const clusters = clusteringMode === 'custom' && customClusters ? customClusters.map(c => c.name) : extractClusters(nodes);
  if (clusters.length === 0) {
    positionDefaultModeNatural(nodes, width, height);
    return;
  }

  const padding = 80;
  const topPadding = 180;
  const availableWidth = width - (2 * padding);
  const columnWidth = availableWidth / clusters.length;
  const availableHeight = height - topPadding - padding;

  const reorderedClusters = clusteringMode === 'custom' && customClusters ? customClusters.map(c => c.name) : getReorderedClusters(nodes);

  reorderedClusters.forEach((clusterName, clusterIndex) => {
    const clusterCenterX = padding + (clusterIndex * columnWidth) + (columnWidth / 2);
    
    let clusterNodes: GraphNode[];
    if (clusteringMode === 'custom' && customClusters) {
        const cluster = customClusters.find(c => c.name === clusterName);
        const nodeIds = cluster ? cluster.nodeIds : [];
        clusterNodes = nodes.filter(n => nodeIds.includes(n.id));
    } else {
        const mainNodes = nodes.filter(n => n.category === 'main');
        const influenceNodes = nodes.filter(n => n.category === 'influence');
        if (clusterName === "Research Focus") {
            clusterNodes = mainNodes;
        } else {
            clusterNodes = influenceNodes.filter(n => n.clusters?.includes(clusterName));
        }
    }
    
    clusterNodes.forEach((node, nodeIndex) => {
      const yProgress = nodeIndex / Math.max(clusterNodes.length - 1, 1);
      node.y = topPadding + (yProgress * availableHeight);
      
      const xVariation = (Math.random() - 0.5) * (columnWidth * 0.4);
      node.x = clusterCenterX + xVariation;
    });
  });
};

const positionDefaultModeChronological = (nodes: GraphNode[], width: number, height: number) => {
  const nodesWithYears = nodes.filter(n => n.year).sort((a, b) => (b.year || 0) - (a.year || 0));
  const nodesWithoutYears = nodes.filter(n => !n.year);

  const padding = 80;
  const availableHeight = height - (2 * padding);

  nodesWithYears.forEach((node, index) => {
    const yProgress = index / Math.max(nodesWithYears.length - 1, 1);
    node.y = padding + (yProgress * availableHeight * 0.8);
  });

  nodesWithYears.forEach((node, index) => {
    const xVariation = (Math.random() - 0.5) * (width * 0.6);
    node.x = (width / 2) + xVariation;
  });

  nodesWithoutYears.forEach((node, index) => {
    node.y = height - padding - 50;
    const spacing = Math.min(120, (width - 2 * padding) / Math.max(nodesWithoutYears.length, 1));
    node.x = padding + (index * spacing);
  });
};

const positionDefaultModeNatural = (nodes: GraphNode[], width: number, height: number) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const minDistance = 120;

  nodes.forEach((node, index) => {
    let positioned = false;
    
    for (let radius = minDistance; radius < Math.min(width, height) / 2; radius += minDistance * 0.7) {
      const positions = Math.max(8, Math.floor(2 * Math.PI * radius / minDistance));
      
      for (let i = 0; i < positions; i++) {
        const angle = (2 * Math.PI * i) / positions + (index * 0.1);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (x < 60 || x > width - 60 || y < 60 || y > height - 60) continue;
        
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
    
    if (!positioned) {
      const fallbackAngle = (index / nodes.length) * 2 * Math.PI;
      const fallbackRadius = Math.min(width, height) / 3;
      node.x = centerX + Math.cos(fallbackAngle) * fallbackRadius;
      node.y = centerY + Math.sin(fallbackAngle) * fallbackRadius;
    }
  });
};

export const extractClusters = (nodes: GraphNode[]): string[] => {
  const clusterSet = new Set<string>();
  
  clusterSet.add("Research Focus");
  
  nodes.forEach(node => {
    if (node.clusters && Array.isArray(node.clusters)) {
      node.clusters.forEach(cluster => clusterSet.add(cluster));
    }
  });
  return Array.from(clusterSet);
};

export const getReorderedClusters = (nodes: GraphNode[]): string[] => {
  const clusters = extractClusters(nodes);
  
  const centerIndex = Math.floor(clusters.length / 2);
  
  const reorderedClusters = [...clusters];
  const researchFocusIndex = reorderedClusters.indexOf("Research Focus");
  if (researchFocusIndex !== -1) {
    reorderedClusters.splice(researchFocusIndex, 1);
    reorderedClusters.splice(centerIndex, 0, "Research Focus");
  }
  
  return reorderedClusters;
};
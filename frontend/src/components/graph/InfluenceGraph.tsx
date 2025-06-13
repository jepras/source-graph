import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../../types/graph';

interface InfluenceGraphProps {
  accumulatedGraph: AccumulatedGraph;
  onNodeClick?: (itemId: string) => void;
  isChronologicalOrder?: boolean;
  onChronologicalToggle?: (enabled: boolean) => void;
  isClusteringEnabled?: boolean;
  onClusteringToggle?: (enabled: boolean) => void;
  onClearGraph?: () => void;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  accumulatedGraph, 
  onNodeClick,
  isChronologicalOrder = false,
  onChronologicalToggle,
  isClusteringEnabled = false,
  onClusteringToggle,
  onClearGraph
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const container = svgRef.current.parentElement;
        setDimensions({
          width: container.clientWidth || 800,
          height: container.clientHeight || 600
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // ====== CLEAN POSITIONING LOGIC ======

  // Main positioning function - 4 clear combinations
  const positionNodes = (nodes: GraphNode[], width: number, height: number) => {

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
      node.y = 85; // Your current main item position
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
      node.y = 85; // Your current main item position
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
  const extractClusters = (nodes: GraphNode[]): string[] => {
    const clusterSet = new Set<string>();
    nodes.forEach(node => {
      if (node.clusters && Array.isArray(node.clusters)) {
        node.clusters.forEach(cluster => clusterSet.add(cluster));
      }
    });
    return Array.from(clusterSet);
  };

  // ====== RENDERING LOGIC ======

  useEffect(() => {
    if (accumulatedGraph.nodes.size === 0 || !svgRef.current) return;

    const nodes = Array.from(accumulatedGraph.nodes.values());
    const links = Array.from(accumulatedGraph.relationships.values());

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.attr("width", width).attr("height", height);

    // ALWAYS recalculate positions (clean behavior)
    positionNodes(nodes, width, height);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        svg.select("g.graph-content").attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for all graph content
    const graphGroup = svg.append("g").attr("class", "graph-content");

    // Draw cluster areas if clustering is enabled
    if (isClusteringEnabled) {
      drawClusterAreas(graphGroup, nodes, width, height);
    }

    // Create links
    const linkSelection = graphGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-width", d => d.confidence * 3)
      .attr("stroke-opacity", 0.6)
      .attr("x1", d => nodes.find(n => n.id === d.source)?.x || 0)
      .attr("y1", d => nodes.find(n => n.id === d.source)?.y || 0)
      .attr("x2", d => nodes.find(n => n.id === d.target)?.x || 0)
      .attr("y2", d => nodes.find(n => n.id === d.target)?.y || 0);

    // Create node groups
    const nodeGroups = graphGroup.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d.id);
      });

    // Add circles
    nodeGroups.append("circle")
      .attr("r", 25)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444")
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#f59e0b" : "#fff")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 4 : 3);

    // Add text labels
    nodeGroups.append("text")
      .attr("dy", 45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

    // Add year labels
    nodeGroups.filter(d => d.year)
      .append("text")
      .attr("dy", -35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#9ca3af")
      .text(d => d.year?.toString() || "");

  }, [accumulatedGraph, dimensions, isChronologicalOrder, isClusteringEnabled]);

  // Helper function to draw cluster areas
  const drawClusterAreas = (graphGroup: any, nodes: GraphNode[], width: number, height: number) => {
    const clusters = extractClusters(nodes);
    const padding = 80;
    const topPadding = 150; // NEW: Extra space for main items
    const columnWidth = (width - 2 * padding) / clusters.length;
    
    // Track label positions to avoid overlap
    const labelPositions: { x: number; y: number; width: number; text: string }[] = [];
  
    clusters.forEach((clusterName, index) => {
      const x = padding + (index * columnWidth);
      
      // Draw cluster background - MOVED DOWN
      graphGroup.append("rect")
        .attr("x", x + 10)
        .attr("y", topPadding) // Changed from 'padding' to 'topPadding'
        .attr("width", columnWidth - 20)
        .attr("height", height - topPadding - padding) // Adjusted height
        .attr("fill", "#f3f4f6")
        .attr("stroke", "#9ca3af")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("rx", 8)
        .attr("opacity", 0.8);
      
      // Calculate label position - MOVED DOWN
      const idealX = x + columnWidth / 2;
      let finalX = idealX;
      let finalY = topPadding - 20; // Changed from 'padding - 20' to 'topPadding - 20'
      
      // Rest of your overlap detection logic stays the same...
      const textWidth = clusterName.length * 8;
      
      let attempts = 0;
      while (attempts < 10) {
        const hasOverlap = labelPositions.some(pos => {
          const xOverlap = Math.abs(pos.x - finalX) < (pos.width + textWidth) / 2;
          const yOverlap = Math.abs(pos.y - finalY) < 20;
          return xOverlap && yOverlap;
        });
        
        if (!hasOverlap) break;
        
        if (attempts % 2 === 0) {
          finalY -= 25;
        } else {
          finalX += (attempts % 4 === 1 ? 20 : -20);
        }
        
        attempts++;
      }
      
      // Add cluster label
      graphGroup.append("text")
        .attr("x", finalX)
        .attr("y", finalY)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#374151")
        .style("text-shadow", "2px 2px 4px rgba(255,255,255,0.8)")
        .text(clusterName);
      
      labelPositions.push({
        x: finalX,
        y: finalY,
        width: textWidth,
        text: clusterName
      });
    });
  };

  // Control handlers
  const handleChronologicalToggle = () => {
    if (onChronologicalToggle) {
      onChronologicalToggle(!isChronologicalOrder);
    }
  };

  const handleClusteringToggle = () => {
    if (onClusteringToggle) {
      onClusteringToggle(!isClusteringEnabled);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Simplified Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={handleClusteringToggle}
          className={`px-3 py-2 border border-gray-300 rounded shadow text-sm ${
            isClusteringEnabled 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-white hover:bg-gray-50'
          }`}
          title="Toggle cluster layout (columns by semantic clusters)"
        >
          🏛️ Clusters
        </button>
        
        <button
          onClick={handleChronologicalToggle}
          className={`px-3 py-2 border border-gray-300 rounded shadow text-sm ${
            isChronologicalOrder 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-white hover:bg-gray-50'
          }`}
          title="Toggle chronological ordering (sort by year)"
        >
          📅 Chronological
        </button>

        {onClearGraph && (
          <button
            onClick={onClearGraph}
            className="px-3 py-2 bg-red-500 text-white border border-red-600 rounded shadow text-sm hover:bg-red-600"
            title="Clear entire graph"
          >
            🗑️ Clear
          </button>
        )}
      </div>

      {/* Graph SVG */}
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ background: '#f9fafb' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded p-3 shadow text-sm">
        <div className="font-semibold mb-2">Layout Mode</div>
        <div className="text-xs text-gray-600 mb-1">
          {isClusteringEnabled ? '🏛️ Cluster Mode' : '🌐 Default Mode'}
        </div>
        <div className="text-xs text-gray-600">
          {isChronologicalOrder ? '📅 Chronological' : '🎲 Natural'}
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-xs">Main Item</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-xs">Influences</span>
          </div>
        </div>
      </div>

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded p-2 shadow text-sm">
        <div className="font-semibold">
          {accumulatedGraph.nodes.size} nodes
        </div>
        <div className="text-gray-600 text-xs">
          {accumulatedGraph.relationships.size} connections
        </div>
        {isClusteringEnabled && (
          <div className="text-blue-600 text-xs">
            {extractClusters(Array.from(accumulatedGraph.nodes.values())).length} clusters
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../../types/graph';
import { positionGraphNodes, extractClusters } from '../../utils/graphUtils';


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
    positionGraphNodes(nodes, {
      isClusteringEnabled,
      isChronologicalOrder,
      width,
      height
    });
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

  }, [
    // Only depend on the actual graph data, not selection state
    accumulatedGraph.nodes.size,
    accumulatedGraph.relationships.size,
    dimensions, 
    isChronologicalOrder, 
    isClusteringEnabled
  ]);

  // Add a separate effect for handling selection changes
  useEffect(() => {
    if (!svgRef.current || accumulatedGraph.nodes.size === 0) return;
    
    // Only update the visual selection state without repositioning
    const svg = d3.select(svgRef.current);
    
    svg.selectAll<SVGCircleElement, GraphNode>(".node circle")
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#f59e0b" : "#fff")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 4 : 3);
      
  }, [accumulatedGraph.selectedNodeId]);

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
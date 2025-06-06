import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../../types/graph';
import { positionNewNodes, findConnectedNodes } from '../../utils/graphUtils';

interface InfluenceGraphProps {
  accumulatedGraph: AccumulatedGraph;
  onNodeClick?: (itemId: string) => void;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  accumulatedGraph, 
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [previousNodeCount, setPreviousNodeCount] = useState(0);

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

  // Helper function: Initial layout for first nodes
  const initialLayout = (nodes: GraphNode[], width: number, height: number) => {
    const mainNode = nodes.find(n => n.category === 'main');
    const influenceNodes = nodes.filter(n => n.category === 'influence');

    // Position main node in center
    if (mainNode) {
      mainNode.x = width / 2;
      mainNode.y = height / 2;
    }

    // Position influence nodes in circle around main
    if (influenceNodes.length > 0) {
      const radius = Math.min(width, height) / 4;
      influenceNodes.forEach((node, index) => {
        const angle = (index / influenceNodes.length) * 2 * Math.PI;
        node.x = (width / 2) + radius * Math.cos(angle);
        node.y = (height / 2) + radius * Math.sin(angle);
      });
    }
  };

  // Helper function: Auto-fit all nodes in view
  const autoFitView = (svg: any, nodes: GraphNode[], width: number, height: number) => {
    if (nodes.length === 0) return;

    const padding = 80;
    const bounds = {
      minX: Math.min(...nodes.map(n => n.x!)) - padding,
      maxX: Math.max(...nodes.map(n => n.x!)) + padding,
      minY: Math.min(...nodes.map(n => n.y!)) - padding,
      maxY: Math.max(...nodes.map(n => n.y!)) + padding
    };

    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    const scaleX = width / boundsWidth;
    const scaleY = height / boundsHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const translateX = (width - boundsWidth * scale) / 2 - bounds.minX * scale;
    const translateY = (height - boundsHeight * scale) / 2 - bounds.minY * scale;

    svg.select("g.graph-content")
      .transition()
      .duration(750)
      .attr("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
  };

  const handleFitToView = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const nodes = Array.from(accumulatedGraph.nodes.values());
    
    if (nodes.length > 0) {
      autoFitView(svg, nodes, dimensions.width, dimensions.height);
    }
  };

  useEffect(() => {
    if (accumulatedGraph.nodes.size === 0 || !svgRef.current) return;

    const nodes = Array.from(accumulatedGraph.nodes.values());
    const links = Array.from(accumulatedGraph.relationships.values());
    const currentNodeCount = nodes.length;

    console.log('Rendering graph:', { nodes: currentNodeCount, links: links.length });

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.attr("width", width).attr("height", height);

    // Position nodes
    const unpositionedNodes = nodes.filter(n => !n.x || !n.y);
    const positionedNodes = nodes.filter(n => n.x && n.y);

    if (positionedNodes.length === 0) {
      // First time: initial layout
      initialLayout(nodes, width, height);
    } else if (unpositionedNodes.length > 0) {
      // New nodes: position near connected nodes
      positionNewNodes(positionedNodes, unpositionedNodes, links, width, height);
    }

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        svg.select("g.graph-content")
          .attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for all graph content
    const graphGroup = svg.append("g")
      .attr("class", "graph-content");

    // Create links
    const linkSelection = graphGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#999")
      .attr("stroke-width", d => d.confidence * 3)
      .attr("stroke-opacity", 0.6)
      .attr("x1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode?.x || 0;
      })
      .attr("y1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode?.y || 0;
      })
      .attr("x2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        return targetNode?.x || 0;
      })
      .attr("y2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        return targetNode?.y || 0;
      });

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

    // Add circles with selection highlighting
    nodeGroups.append("circle")
      .attr("r", d => d.category === 'main' ? 30 : 25)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444")
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#f59e0b" : "#fff")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 4 : 3);

    // Add selection indicator for selected node
    nodeGroups.filter(d => d.id === accumulatedGraph.selectedNodeId)
      .append("circle")
      .attr("r", d => d.category === 'main' ? 35 : 30)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .style("animation", "pulse 2s infinite");

    // Add labels
    nodeGroups.append("text")
      .attr("dy", 45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + "..." : d.name);

    // Add type labels
    nodeGroups.filter(d => d.type)
      .append("text")
      .attr("dy", 58)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .text(d => d.type || "");

    // Add year labels
    nodeGroups.filter(d => d.year)
      .append("text")
      .attr("dy", -35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#9ca3af")
      .text(d => d.year?.toString() || "");

    // Auto-fit view if many new nodes were added
    if (currentNodeCount > previousNodeCount + 2) {
      setTimeout(() => {
        autoFitView(svg, nodes, width, height);
      }, 100);
    }

    setPreviousNodeCount(currentNodeCount);

  }, [accumulatedGraph, dimensions, onNodeClick, previousNodeCount]);

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={handleFitToView}
          className="px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-sm"
          title="Fit all nodes to view"
        >
          🔍 Fit to View
        </button>
      </div>

      {/* Graph SVG */}
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ background: '#f9fafb' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded p-3 shadow text-sm">
        <div className="font-semibold mb-2">Legend</div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span>Main Item</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span>Influences</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 bg-transparent mr-2"></div>
          <span>Selected</span>
        </div>
      </div>

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded p-2 shadow text-sm">
        <div className="font-semibold">
          {accumulatedGraph.nodes.size} nodes
        </div>
        <div className="text-gray-600">
          {accumulatedGraph.relationships.size} connections
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};
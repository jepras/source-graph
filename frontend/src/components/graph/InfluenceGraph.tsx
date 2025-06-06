import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphResponse } from '../../services/api';

interface InfluenceGraphProps {
  data: GraphResponse | null;
  onNodeClick?: (itemId: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  year?: number;
  artist?: string;
  x?: number;
  y?: number;
  category: 'main' | 'influence';
}

interface GraphLink {
  source: string;
  target: string;
  confidence: number;
  influence_type: string;
  explanation: string;
  category: string;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  data, 
  onNodeClick 
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

  // Helper function: Position nodes in circle
  const positionNodesInCircle = (nodes: GraphNode[], centerX: number, centerY: number, radius: number) => {
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });
  };

  // Helper function: Position nodes in grid
  const positionNodesInGrid = (nodes: GraphNode[], startX: number, startY: number, width: number, height: number) => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      node.x = startX + (col + 0.5) * cellWidth;
      node.y = startY + (row + 0.5) * cellHeight;
    });
  };

  // Helper function: Auto-fit all nodes in view
  const autoFitView = (svg: any, nodes: GraphNode[], width: number, height: number) => {
    if (nodes.length === 0) return;

    // Calculate bounds of all nodes
    const padding = 80;
    const bounds = {
      minX: Math.min(...nodes.map(n => n.x!)) - padding,
      maxX: Math.max(...nodes.map(n => n.x!)) + padding,
      minY: Math.min(...nodes.map(n => n.y!)) - padding,
      maxY: Math.max(...nodes.map(n => n.y!)) + padding
    };

    const boundsWidth = bounds.maxX - bounds.minX;
    const boundsHeight = bounds.maxY - bounds.minY;

    // Calculate scale to fit all nodes
    const scaleX = width / boundsWidth;
    const scaleY = height / boundsHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

    // Calculate translation to center the bounds
    const translateX = (width - boundsWidth * scale) / 2 - bounds.minX * scale;
    const translateY = (height - boundsHeight * scale) / 2 - bounds.minY * scale;

    // Apply transform with smooth transition
    svg.select("g.graph-content")
      .transition()
      .duration(750)
      .attr("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
  };

  // Fit to view function for button
  const handleFitToView = () => {
    if (!svgRef.current || !data) return;
    
    const svg = d3.select(svgRef.current);
    
    // Get all nodes with positions
    const allNodes = svg.selectAll('.node').data() as GraphNode[];
    
    if (allNodes.length > 0) {
      autoFitView(svg, allNodes, dimensions.width, dimensions.height);
    }
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.attr("width", width).attr("height", height);

    // Prepare data
    const nodes: GraphNode[] = [
      {
        id: data.main_item.id,
        name: data.main_item.name,
        type: data.main_item.auto_detected_type || 'unknown',
        year: data.main_item.year,
        category: 'main'
      },
      ...data.influences.map(influence => ({
        id: influence.from_item.id,
        name: influence.from_item.name,
        type: influence.from_item.auto_detected_type || 'unknown',
        year: influence.from_item.year,
        category: 'influence' as const
      }))
    ];

    const links: GraphLink[] = data.influences.map(influence => ({
      source: influence.from_item.id,
      target: influence.to_item.id,
      confidence: influence.confidence,
      influence_type: influence.influence_type,
      explanation: influence.explanation,
      category: influence.category
    }));

    // Smart positioning
    const margin = 60;
    const usableWidth = width - (margin * 2);
    const usableHeight = height - (margin * 2);

    // Position main item in center
    const mainNode = nodes.find(n => n.category === 'main');
    if (mainNode) {
      mainNode.x = width / 2;
      mainNode.y = height / 2;
    }

    // Position influence nodes
    const influenceNodes = nodes.filter(n => n.category === 'influence');
    
    if (influenceNodes.length > 0) {
      if (influenceNodes.length <= 8) {
        // Small number: arrange in circle around center
        const radius = Math.min(usableWidth, usableHeight) / 3;
        positionNodesInCircle(influenceNodes, width / 2, height / 2, radius);
      } else {
        // Large number: arrange in grid
        positionNodesInGrid(influenceNodes, margin, margin, usableWidth, usableHeight);
      }
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

    // Add circles
    nodeGroups.append("circle")
      .attr("r", d => d.category === 'main' ? 30 : 25)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3);

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

    // Auto-fit view after everything is positioned
    setTimeout(() => {
      autoFitView(svg, nodes, width, height);
    }, 100);

  }, [data, dimensions, onNodeClick]);

  return (
    <div className="relative w-full h-full">
      {/* Fit to View Button */}
      <button
        onClick={handleFitToView}
        className="absolute top-4 right-4 z-10 px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-sm"
        title="Fit all nodes to view"
      >
        🔍 Fit to View
      </button>

      {/* Graph SVG */}
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ background: '#f9fafb' }}
      />

      {/* Legend */}
      {data && (
        <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded p-3 shadow text-sm">
          <div className="font-semibold mb-2">Legend</div>
          <div className="flex items-center mb-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
            <span>Main Item</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span>Influences</span>
          </div>
        </div>
      )}

      {/* Node Count */}
      {data && (
        <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded p-2 shadow text-sm">
          <div className="font-semibold">
            {data.influences.length + 1} items
          </div>
          <div className="text-gray-600">
            {data.categories.length} categories
          </div>
        </div>
      )}
    </div>
  );
};
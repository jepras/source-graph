import React, { useEffect, useRef } from 'react';
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
  category?: string;
}

interface GraphLink {
  source: string;
  target: string;
  confidence: number;
  influence_type: string;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  data, 
  onNodeClick 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    svg.attr("width", width).attr("height", height);

    // Prepare data
    const nodes: GraphNode[] = [
      {
        id: data.main_item.id,
        name: data.main_item.name,
        type: data.main_item.type,
        year: data.main_item.year,
        artist: data.main_item.artist,
        category: 'main'
      },
      ...data.influences.map(influence => ({
        id: influence.from_item.id,
        name: influence.from_item.name,
        type: influence.from_item.type,
        year: influence.from_item.year,
        artist: influence.from_item.artist,
        category: 'influence'
      }))
    ];

    const links: GraphLink[] = data.influences.map(influence => ({
      source: influence.from_item.id,
      target: influence.to_item.id,
      confidence: influence.confidence,
      influence_type: influence.influence_type
    }));

    // Position main item at top center
    const mainNode = nodes.find(n => n.category === 'main');
    if (mainNode) {
      mainNode.x = width / 2;
      mainNode.y = 100;
    }

    // Position influence nodes in timeline order
    const influenceNodes = nodes.filter(n => n.category === 'influence');
    influenceNodes.sort((a, b) => (a.year || 0) - (b.year || 0));
    
    influenceNodes.forEach((node, index) => {
      const spacing = Math.min(120, (width - 100) / Math.max(influenceNodes.length - 1, 1));
      node.x = 50 + index * spacing;
      node.y = 400;
    });

    // Create links
    const linkSelection = svg.selectAll(".link")
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
    const nodeGroups = svg.selectAll(".node")
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
      .attr("r", d => d.category === 'main' ? 25 : 20)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels
    nodeGroups.append("text")
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

    // Add artist labels
    nodeGroups.filter(d => d.artist !== undefined)
      .append("text")
      .attr("dy", 48)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#666")
      .text(d => d.artist || "");

    // Add year labels
    nodeGroups.filter(d => d.year !== undefined)
      .append("text")
      .attr("dy", -30)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#999")
      .text(d => d.year?.toString() || "");

  }, [data, onNodeClick]);

  return (
    <div className="w-full flex justify-center">
      <svg ref={svgRef} className="border border-gray-300 rounded-lg"></svg>
    </div>
  );
};
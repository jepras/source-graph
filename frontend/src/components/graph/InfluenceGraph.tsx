import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Wand2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
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
  const [showControls, setShowControls] = useState(false);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

  // ====== FLOATING CONTROLS HANDLERS ======

  const handleRetrieveClusters = () => {
    // TODO: Implement AI cluster retrieval
    console.log('Retrieve clusters clicked');
  };

  const handleCreateNewCluster = () => {
    // TODO: Implement new cluster creation
    console.log('Create new cluster clicked');
  };

  const handleAutoCluster = () => {
    // TODO: Implement auto clustering
    console.log('Auto cluster clicked');
  };

  const handleResetGraph = () => {
    // TODO: Implement graph reset
    console.log('Reset graph clicked');
  };

  const handleExportGraph = () => {
    // TODO: Implement graph export
    console.log('Export graph clicked');
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
      .attr("stroke", "#374151") // Updated to design-gray-700
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
        // Automatically show the details panel when a node is clicked
        setShowSelectedPanel(true);
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        setMousePosition({ x: event.clientX, y: event.clientY });
      })
      .on("mousemove", (event, d) => {
        setMousePosition({ x: event.clientX, y: event.clientY });
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
      });

    // Add circles with updated colors
    nodeGroups.append("circle")
      .attr("r", 25)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444") // Blue for main, red for influences
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#ffffff" : "#1f2937") // White for selected, dark gray for others
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 3 : 2);

    // Add text labels with updated colors
    nodeGroups.append("text")
      .attr("dy", 45)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#e5e7eb") // Updated to design-gray-200
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

    // Add year labels with updated colors
    nodeGroups.filter(d => d.year !== undefined && d.year !== null)
      .append("text")
      .attr("dy", -35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#9ca3af") // Updated to design-gray-400
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
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#ffffff" : "#1f2937")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 3 : 2);
      
  }, [accumulatedGraph.selectedNodeId]);

  // Show details panel when a node is selected
  useEffect(() => {
    if (accumulatedGraph.selectedNodeId) {
      setShowSelectedPanel(true);
    }
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
        .attr("fill", "#1f2937") // Updated to design-gray-800
        .attr("stroke", "#374151") // Updated to design-gray-700
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("rx", 8)
        .attr("opacity", 0.8);
      
      // Calculate label position - MOVED DOWN
      const idealX = x + columnWidth / 2;
      let finalX = idealX;
      let finalY = topPadding - 20; // Changed from 'padding - 20' to 'topPadding - 20'
      
      // Check for overlap with existing labels
      const labelWidth = clusterName.length * 8; // Approximate text width
      const hasOverlap = labelPositions.some(pos => 
        Math.abs(finalX - pos.x) < (labelWidth + pos.width) / 2 + 10 &&
        Math.abs(finalY - pos.y) < 20
      );
      
      if (hasOverlap) {
        finalY += 20; // Move down if overlap
      }
      
      // Draw cluster label
      graphGroup.append("text")
        .attr("x", finalX)
        .attr("y", finalY)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#ef4444") // Updated to red accent color
        .text(clusterName);
      
      // Track this label position
      labelPositions.push({ x: finalX, y: finalY, width: labelWidth, text: clusterName });
    });
  };

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
    <div className="h-full flex bg-design-gray-950 relative overflow-hidden">
      {/* Main Graph Area */}
      <div className={`transition-all duration-300 overflow-hidden ${showSelectedPanel ? "flex-1" : "w-full"}`}>
        <div className="h-full relative overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" />

          {/* Floating Controls Button */}
          <div className="absolute top-4 left-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs px-3 py-1.5"
              onClick={() => setShowControls(!showControls)}
            >
              Graph Controls
            </Button>

            {/* Floating Controls Panel */}
            {showControls && (
              <Card className="absolute top-10 left-0 w-80 shadow-xl z-10 bg-design-gray-950 border-design-gray-800">
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-design-gray-200 mb-2">View Mode</h4>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant={isClusteringEnabled ? "default" : "outline"}
                          onClick={handleClusteringToggle}
                          className={`flex-1 text-xs py-1 h-7 ${
                            isClusteringEnabled
                              ? "bg-design-green hover:bg-design-green-hover text-white border-0"
                              : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                          }`}
                        >
                          🔗 Clusters
                        </Button>
                        <Button
                          size="sm"
                          variant={isChronologicalOrder ? "default" : "outline"}
                          onClick={handleChronologicalToggle}
                          className={`flex-1 text-xs py-1 h-7 ${
                            isChronologicalOrder
                              ? "bg-design-green hover:bg-design-green-hover text-white border-0"
                              : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                          }`}
                        >
                          📅 Timeline
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-design-gray-200 mb-2">Graph Actions</h4>
                      <div className="grid grid-cols-1 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onClearGraph}
                          className="w-full justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                        >
                          🧹 Clear Graph
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleResetGraph}
                            className="justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                          >
                            🔄 Reset
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportGraph}
                            className="justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                          >
                            📊 Export
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-design-gray-200 mb-2">AI Cluster Tools</h4>
                      <div className="space-y-1">
                        <Button
                          size="sm"
                          onClick={handleRetrieveClusters}
                          className="w-full justify-start bg-design-green hover:bg-design-green-hover text-white text-xs py-1 h-7"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Retrieve clusters
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCreateNewCluster}
                            className="justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            New
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAutoCluster}
                            className="justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                          >
                            🎯 Auto
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-design-gray-800/50 pt-2">
                      <div className="text-xs text-design-gray-400 space-y-1">
                        <div>
                          <span className="font-medium text-design-gray-300">{accumulatedGraph.nodes.size} nodes</span> •{" "}
                          <span>{accumulatedGraph.relationships.size} connections</span>
                        </div>
                        <div>
                          <span>{isClusteringEnabled ? extractClusters(Array.from(accumulatedGraph.nodes.values())).length : 0} clusters</span> •{" "}
                          <span>{Array.from(accumulatedGraph.nodes.values()).filter(n => n.category === 'main').length} main items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected Panel Toggle Button */}
          <div className="absolute top-4 right-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs px-3 py-1.5"
              onClick={() => setShowSelectedPanel(!showSelectedPanel)}
            >
              {showSelectedPanel ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
              <span className="ml-1">{showSelectedPanel ? "Hide" : "Details"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Selected Item Panel */}
      <div
        className={`transition-all duration-300 border-l border-design-gray-800 bg-design-gray-950 overflow-hidden ${
          showSelectedPanel ? "w-96" : "w-0"
        }`}
      >
        {showSelectedPanel && (
          <ItemDetailsPanel />
        )}
      </div>

      {/* Hover Card */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
          }}
        >
          <div className="bg-design-gray-950/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ 
                backgroundColor: hoveredNode.category === 'main' ? "#3b82f6" : "#ef4444" 
              }} />
              <h4 className="text-sm font-medium text-design-gray-100 truncate">{hoveredNode.name}</h4>
              <span className="text-xs text-design-gray-500">({hoveredNode.year})</span>
            </div>
            <p className="text-xs text-design-gray-400 leading-relaxed">
              {hoveredNode.category === 'main' ? 'Main item' : 'Influence item'}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-design-gray-500 bg-design-gray-900 px-1.5 py-0.5 rounded">
                {hoveredNode.category}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
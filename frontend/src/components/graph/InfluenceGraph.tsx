import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Wand2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../../types/graph';
import { positionGraphNodes, extractClusters, getReorderedClusters } from '../../utils/graphUtils';
import { useGraph } from '../../contexts/GraphContext';
import { CustomClusterManager } from './CustomClusterManager';

interface InfluenceGraphProps {
  onNodeClick?: (itemId: string) => void;
  isResearchPanelCollapsed?: boolean;
  onToggleResearchPanel?: () => void;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  onNodeClick,
  isResearchPanelCollapsed = false,
  onToggleResearchPanel
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showControls, setShowControls] = useState(false);
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { state, dispatch, selectNode, toggleChronologicalOrder, toggleClustering, setClusteringMode, initializeCustomClusters, clearGraph, highlightEdgesForNode, clearHighlightedEdges } = useGraph();
  const { accumulatedGraph, isChronologicalOrder, isClusteringEnabled, clusteringMode, customClusters, highlightedEdgeIds } = state;

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
  }, [accumulatedGraph.nodes.size]);

  const positionNodes = (nodes: GraphNode[], width: number, height: number) => {
    positionGraphNodes(nodes, {
      isClusteringEnabled,
      isChronologicalOrder,
      width,
      height,
      clusteringMode,
      customClusters,
    });
  };

  const handleFitToView = () => {
    if (svgRef.current?.parentElement) {
      const container = svgRef.current.parentElement;
      const newDimensions = {
        width: container.clientWidth || 800,
        height: container.clientHeight || 600
      };
      setDimensions(newDimensions);
      
      const nodes = Array.from(accumulatedGraph.nodes.values());
      if (nodes.length > 0) {
        positionNodes(nodes, newDimensions.width, newDimensions.height);
      }
    }
  };

  useEffect(() => {
    if (accumulatedGraph.nodes.size === 0 || !svgRef.current) return;

    const nodes = Array.from(accumulatedGraph.nodes.values());
    const links = Array.from(accumulatedGraph.relationships.values());

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.attr("width", width).attr("height", height);

    // Add click handler to clear highlights when clicking on empty space
    svg.on("click", (event) => {
      // Only clear if clicking on the SVG background, not on nodes or other elements
      if (event.target === svgRef.current) {
        clearHighlightedEdges();
        selectNode(null);
        setShowSelectedPanel(false);
      }
    });

    positionNodes(nodes, width, height);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        svg.select("g.graph-content").attr("transform", event.transform);
      });

    svg.call(zoom);

    const graphGroup = svg.append("g").attr("class", "graph-content");

    if (isClusteringEnabled) {
      drawClusterAreas(graphGroup, nodes, width, height);
    }

    graphGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#374151")
      .attr("stroke-width", d => d.confidence * 3)
      .attr("stroke-opacity", d => {
        const linkId = `${d.source}-${d.target}`;
        return highlightedEdgeIds.has(linkId) ? 1.0 : 0.4;
      })
      .attr("x1", d => nodes.find(n => n.id === d.source)?.x || 0)
      .attr("y1", d => nodes.find(n => n.id === d.source)?.y || 0)
      .attr("x2", d => nodes.find(n => n.id === d.target)?.x || 0)
      .attr("y2", d => nodes.find(n => n.id === d.target)?.y || 0);

    const nodeGroups = graphGroup.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (onNodeClick) onNodeClick(d.id);
        selectNode(d.id);
        highlightEdgesForNode(d.id);
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

    nodeGroups.append("circle")
      .attr("r", 14)
      .attr("fill", d => d.category === 'main' ? "#3b82f6" : "#ef4444")
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#ffffff" : "#1f2937")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 3 : 2);

    nodeGroups.append("text")
      .attr("dy", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#e5e7eb")
      .each(function(d) {
        const text = d3.select(this);
        const name = d.name;
        
        if (name.length > 20) {
          // Split into two lines for longer names
          const words = name.split(' ');
          const midPoint = Math.ceil(words.length / 2);
          const line1 = words.slice(0, midPoint).join(' ');
          const line2 = words.slice(midPoint).join(' ');
          
          text.text(line1);
          text.append("tspan")
            .attr("x", 0)
            .attr("dy", "1.2em")
            .text(line2);
        } else {
          text.text(name);
        }
      });

    nodeGroups.filter(d => d.year !== undefined && d.year !== null)
      .append("text")
      .attr("dy", 3)
      .attr("text-anchor", "middle")
      .style("font-size", "7px")
      .style("font-weight", "500")
      .style("fill", "#ffffff")
      .text(d => d.year?.toString() || "");

  }, [
    accumulatedGraph.nodes.size,
    accumulatedGraph.relationships.size,
    dimensions, 
    isChronologicalOrder, 
    isClusteringEnabled,
    clusteringMode,
    customClusters,
    highlightedEdgeIds
  ]);

  useEffect(() => {
    if (!svgRef.current || accumulatedGraph.nodes.size === 0) return;
    
    const svg = d3.select(svgRef.current);
    
    svg.selectAll<SVGCircleElement, GraphNode>(".node circle")
      .attr("stroke", d => d.id === accumulatedGraph.selectedNodeId ? "#ffffff" : "#1f2937")
      .attr("stroke-width", d => d.id === accumulatedGraph.selectedNodeId ? 3 : 2);
      
  }, [accumulatedGraph.selectedNodeId]);

  useEffect(() => {
    if (!svgRef.current || accumulatedGraph.nodes.size === 0) return;
    
    const svg = d3.select(svgRef.current);
    const links = Array.from(accumulatedGraph.relationships.values());
    
    svg.selectAll<SVGLineElement, GraphLink>(".link")
      .attr("stroke-opacity", d => {
        const linkId = `${d.source}-${d.target}`;
        return highlightedEdgeIds.has(linkId) ? 1.0 : 0.4;
      });
      
  }, [highlightedEdgeIds, accumulatedGraph.relationships.size]);

  useEffect(() => {
    if (accumulatedGraph.selectedNodeId) {
      setShowSelectedPanel(true);
    }
  }, [accumulatedGraph.selectedNodeId]);

  const drawClusterAreas = (graphGroup: any, nodes: GraphNode[], width: number, height: number) => {
    const clusters = clusteringMode === 'custom' 
      ? customClusters.map(c => c.name)
      : getReorderedClusters(nodes);
    
    const padding = 30;
    const topPadding = 55;
    const columnWidth = (width - 2 * padding) / clusters.length;
    
    clusters.forEach((clusterName, index) => {
      const x = padding + (index * columnWidth);
      
      graphGroup.append("rect")
        .attr("x", x + 10)
        .attr("y", topPadding)
        .attr("width", columnWidth - 20)
        .attr("height", height - topPadding - padding)
        .attr("fill", "#121212")
        .attr("stroke", "#374151")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("rx", 8)
        .attr("opacity", 0.8);
      
      const clusterLeftX = x + 25;
      const clusterBottomY = height - padding - 10;
      
      graphGroup.append("text")
        .attr("x", clusterLeftX)
        .attr("y", clusterBottomY)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .attr("transform", `rotate(-90, ${clusterLeftX}, ${clusterBottomY})`)
        .style("font-size", "16px")
        .style("font-weight", "600")
        .style("fill", "#ef4444")
        .style("opacity", "0.3")
        .style("pointer-events", "none")
        .text(clusterName);
    });
  };

  const handleClusteringModeChange = (mode: 'item' | 'custom') => {
    setClusteringMode(mode);
    if (mode === 'custom' && customClusters.length === 0) {
      const mainNode = Array.from(accumulatedGraph.nodes.values()).find(n => n.category === 'main');
      if (mainNode) {
        initializeCustomClusters(Array.from(accumulatedGraph.nodes.values()), mainNode.id);
      }
    }
  };

  const handleCloseDetailsPanel = () => {
    setShowSelectedPanel(false);
    selectNode(null);
    clearHighlightedEdges();
  };

  return (
    <div className="h-full flex bg-black relative overflow-hidden">
      <div className="overflow-hidden w-full">
        <div className="h-full relative overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" />

          <div className="absolute top-4 left-4">
            <div className="flex items-center space-x-2">
              {onToggleResearchPanel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-design-gray-1100 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs px-3 py-1.5"
                  onClick={onToggleResearchPanel}
                >
                  {isResearchPanelCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                  <span className="ml-1">{isResearchPanelCollapsed ? "Research" : "Hide"}</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                className="bg-design-gray-1100 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs px-3 py-1.5"
                onClick={() => setShowControls(!showControls)}
              >
                Graph Controls
              </Button>
            </div>

            {showControls && (
              <Card className="absolute top-10 left-0 w-80 shadow-xl z-10 bg-design-gray-1100 border-design-gray-800 h-[80vh] p-0">
                <CardContent className="p-3 h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-design-gray-200 mb-2">Graph Actions</h4>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearGraph}
                          className="flex-1 justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                        >
                          🧹 Clear Graph
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleFitToView}
                          className="flex-1 justify-start bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 text-xs py-1 h-7"
                        >
                          🔍 Fit to View
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-design-gray-200 mb-2">View Mode</h4>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant={isClusteringEnabled ? "default" : "outline"}
                          onClick={toggleClustering}
                          className={`flex-1 text-xs py-1 h-7 ${
                            isClusteringEnabled
                              ? "bg-design-red hover:bg-design-red-hover text-white border-0"
                              : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                          }`}
                        >
                          🔗 Clusters
                        </Button>
                        <Button
                          size="sm"
                          variant={isChronologicalOrder ? "default" : "outline"}
                          onClick={toggleChronologicalOrder}
                          className={`flex-1 text-xs py-1 h-7 ${
                            isChronologicalOrder
                              ? "bg-design-red hover:bg-design-red-hover text-white border-0"
                              : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                          }`}
                        >
                          📅 Timeline
                        </Button>
                      </div>
                    </div>

                    {isClusteringEnabled && (
                      <div>
                        <h4 className="text-xs font-medium text-design-gray-200 mb-2">Cluster Type</h4>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant={clusteringMode === 'item' ? 'default' : 'outline'}
                            onClick={() => handleClusteringModeChange('item')}
                            className={`flex-1 text-xs py-1 h-7 ${
                              clusteringMode === 'item'
                                ? "bg-design-red hover:bg-design-red-hover text-white border-0"
                                : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                            }`}
                          >
                            Item Clusters
                          </Button>
                          <Button
                            size="sm"
                            variant={clusteringMode === 'custom' ? 'default' : 'outline'}
                            onClick={() => handleClusteringModeChange('custom')}
                            className={`flex-1 text-xs py-1 h-7 ${
                              clusteringMode === 'custom'
                                ? "bg-design-red hover:bg-design-red-hover text-white border-0"
                                : "bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900"
                            }`}
                          >
                            Custom Clusters
                          </Button>
                        </div>
                      </div>
                    )}

                    {clusteringMode === 'custom' && isClusteringEnabled && <CustomClusterManager />}

                    <div className="border-t border-design-gray-800/50 pt-2">
                      <div className="text-xs text-design-gray-400 space-y-1">
                        <div>
                          <span className="font-medium text-design-gray-300">{accumulatedGraph.nodes.size} nodes</span> •{" "}
                          <span>{accumulatedGraph.relationships.size} connections</span>
                        </div>
                        <div>
                          <span>{isClusteringEnabled ? (clusteringMode === 'custom' ? customClusters.length : extractClusters(Array.from(accumulatedGraph.nodes.values())).length) : 0} clusters</span> •{" "}
                          <span>{Array.from(accumulatedGraph.nodes.values()).filter(n => n.category === 'main').length} main items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Selected Item Panel */}
      {showSelectedPanel && (
        <div className="absolute top-0 right-0 h-full w-96 border-l border-design-gray-800 bg-design-gray-950 overflow-hidden z-10">
          <ItemDetailsPanel onClose={handleCloseDetailsPanel} />
        </div>
      )}

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
              {hoveredNode.description || (hoveredNode.category === 'main' ? 'Main item' : 'Influence item')}
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
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { AccumulatedGraph, GraphNode, GraphLink } from '../../types/graph';
import { positionNewNodes, findConnectedNodes, positionNodesChronologically, positionNodesCategorically, extractCategories } from '../../utils/graphUtils';

interface InfluenceGraphProps {
  accumulatedGraph: AccumulatedGraph;
  onNodeClick?: (itemId: string) => void;
  isChronologicalOrder?: boolean;
  onChronologicalToggle?: (enabled: boolean) => void;
  isCategoricalLayout?: boolean;
  onCategoricalToggle?: (enabled: boolean) => void;
  isClusteringEnabled?: boolean; // NEW: Add clustering prop
  onClusteringToggle?: (enabled: boolean) => void; // NEW: Add clustering toggle
  onClearGraph?: () => void;
}

export const InfluenceGraph: React.FC<InfluenceGraphProps> = ({ 
  accumulatedGraph, 
  onNodeClick,
  isChronologicalOrder = false,
  onChronologicalToggle,
  isCategoricalLayout = false,
  onCategoricalToggle,
  isClusteringEnabled = true, // NEW: Default clustering enabled
  onClusteringToggle, // NEW: Add clustering toggle
  onClearGraph
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

  // In the InfluenceGraph component, update the extractClusters function:
  const extractClusters = (nodes: GraphNode[]) => {
    const clusterSet = new Set<string>();
    console.log('🔍 Extracting clusters from nodes:', nodes.map(n => ({ id: n.id, clusters: n.clusters })));
    
    nodes.forEach(node => {
      if (node.clusters && Array.isArray(node.clusters)) {
        console.log(`Node ${node.name} has clusters:`, node.clusters);
        node.clusters.forEach(cluster => clusterSet.add(cluster));
      } else {
        console.log(`Node ${node.name} has no clusters:`, node.clusters);
      }
    });
    
    const clusters = Array.from(clusterSet);
    console.log('🎯 Final extracted clusters:', clusters);
    return clusters;
  };

  // Add this function right after your extractClusters function in InfluenceGraph.tsx:
  const preserveExistingNodePositions = (nodes: GraphNode[], previousPositions: Map<string, {x: number, y: number}>) => {
    nodes.forEach(node => {
      const savedPosition = previousPositions.get(node.id);
      if (savedPosition) {
        node.x = savedPosition.x;
        node.y = savedPosition.y;
        console.log(`🔒 Preserved position for ${node.name} at:`, { x: node.x, y: node.y });
      }
    });
  };

  // NEW: Helper function to position nodes in cluster areas
const positionNodesInClusters = (nodes: GraphNode[], width: number, height: number) => {
  const mainNode = nodes.find(n => n.category === 'main');
  const influenceNodes = nodes.filter(n => n.category === 'influence');
  
  console.log('🎯 Positioning nodes in clusters:', { 
    total: nodes.length, 
    influences: influenceNodes.length 
  });
  
  // Position main node at top center
  if (mainNode) {
    mainNode.x = width / 2;
    mainNode.y = 100;
    console.log('📍 Main node positioned at:', { x: mainNode.x, y: mainNode.y });
  }

  if (influenceNodes.length === 0) {
    console.log('❌ No influence nodes to cluster');
    return;
  }

  // Extract unique clusters
  const clusters = extractClusters(influenceNodes);
  console.log('🏷️ Found clusters:', clusters);
  
  if (clusters.length === 0) {
    console.log('❌ No clusters found, using fallback positioning');
    // Fallback to default positioning if no clusters
    influenceNodes.forEach((node, index) => {
      const spacing = Math.min(120, (width - 100) / Math.max(influenceNodes.length - 1, 1));
      node.x = 50 + index * spacing;
      node.y = 400;
      console.log(`📍 Fallback positioned ${node.name} at:`, { x: node.x, y: node.y });
    });
    return;
  }

  // Calculate cluster area dimensions
  const clusterAreaHeight = height - 250; // Space below main node
  const clusterAreaWidth = width - 100; // Padding on sides
  const clustersPerRow = Math.ceil(Math.sqrt(clusters.length));
  const clusterWidth = clusterAreaWidth / clustersPerRow;
  const clusterHeight = clusterAreaHeight / Math.ceil(clusters.length / clustersPerRow);

  console.log('📐 Cluster layout:', {
    clustersPerRow,
    clusterWidth,
    clusterHeight,
    totalClusters: clusters.length
  });

  // Position nodes within cluster areas
  clusters.forEach((clusterName, clusterIndex) => {
    const clusterRow = Math.floor(clusterIndex / clustersPerRow);
    const clusterCol = clusterIndex % clustersPerRow;
    
    const clusterCenterX = 50 + clusterCol * clusterWidth + clusterWidth / 2;
    const clusterCenterY = 250 + clusterRow * clusterHeight + clusterHeight / 2;
    
    console.log(`🎯 Cluster "${clusterName}" area:`, {
      centerX: clusterCenterX,
      centerY: clusterCenterY,
      row: clusterRow,
      col: clusterCol
    });
    
    // Find nodes that belong to this cluster
    const clusterNodes = influenceNodes.filter(node => 
      node.clusters && node.clusters.includes(clusterName)
    );
    
    console.log(`📦 Nodes in cluster "${clusterName}":`, clusterNodes.map(n => n.name));
    
    // Position nodes in a circle within the cluster area
    const radius = Math.min(clusterWidth, clusterHeight) / 4;
    clusterNodes.forEach((node, nodeIndex) => {
      if (clusterNodes.length === 1) {
        node.x = clusterCenterX;
        node.y = clusterCenterY;
      } else {
        const angle = (nodeIndex / clusterNodes.length) * 2 * Math.PI;
        node.x = clusterCenterX + radius * Math.cos(angle);
        node.y = clusterCenterY + radius * Math.sin(angle);
      }
      console.log(`📍 Positioned ${node.name} in cluster at:`, { x: node.x, y: node.y });
    });
  });

  // Handle nodes without clusters (position them separately)
  const noClusterNodes = influenceNodes.filter(node => 
    !node.clusters || node.clusters.length === 0
  );
  
  if (noClusterNodes.length > 0) {
    console.log('🔄 Positioning nodes without clusters:', noClusterNodes.map(n => n.name));
    // Position unclustered nodes at the bottom
    noClusterNodes.forEach((node, index) => {
      const spacing = Math.min(120, (width - 100) / Math.max(noClusterNodes.length - 1, 1));
      node.x = 50 + index * spacing;
      node.y = height - 100;
      console.log(`📍 Positioned unclustered ${node.name} at:`, { x: node.x, y: node.y });
    });
  }
};

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

  const handleChronologicalToggle = () => {
    if (onChronologicalToggle) {
      onChronologicalToggle(!isChronologicalOrder);
    }
  };

  const handleCategoricalToggle = () => {
    if (onCategoricalToggle) {
      onCategoricalToggle(!isCategoricalLayout);
    }
  };

  // NEW: Add handler for clustering toggle
  const handleClusteringToggle = () => {
    if (onClusteringToggle) {
      onClusteringToggle(!isClusteringEnabled);
    }
  };

  useEffect(() => {
    if (accumulatedGraph.nodes.size === 0 || !svgRef.current) return;

    const nodes = Array.from(accumulatedGraph.nodes.values());
    const links = Array.from(accumulatedGraph.relationships.values());
    const currentNodeCount = nodes.length;

    console.log('Rendering graph:', { nodes: currentNodeCount, links: links.length, clustering: isClusteringEnabled });

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    svg.attr("width", width).attr("height", height);

    // ADD THIS: Save current positions before repositioning
    const currentPositions = new Map<string, {x: number, y: number}>();
    nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined) {
        currentPositions.set(node.id, { x: node.x, y: node.y });
      }
    });

    // Position nodes based on current layout settings
    const unpositionedNodes = nodes.filter(n => !n.x || !n.y);
    const positionedNodes = nodes.filter(n => n.x && n.y);

    if (isClusteringEnabled) {
      // NEW: Clustering mode - group by clusters
      positionNodesInClusters(nodes, width, height);
      // ADD THIS: Restore positions for existing nodes
      preserveExistingNodePositions(nodes, currentPositions);
    } else if (isCategoricalLayout) {
      // Categorical mode: arrange by categories (and chronologically within categories if both are on)
      positionNodesCategorically(nodes, width, height, isChronologicalOrder);
      // ADD THIS: Restore positions for existing nodes
      preserveExistingNodePositions(nodes, currentPositions);
    } else if (isChronologicalOrder) {
      // Chronological mode only: reposition all nodes
      positionNodesChronologically(nodes, width, height);
      // ADD THIS: Restore positions for existing nodes  
      preserveExistingNodePositions(nodes, currentPositions);
    } else {
      // Normal mode: use existing positioning logic
      if (positionedNodes.length === 0) {
        // First time: initial layout
        initialLayout(nodes, width, height);
      } else if (unpositionedNodes.length > 0) {
        // New nodes: position near connected nodes
        positionNewNodes(positionedNodes, unpositionedNodes, links, width, height);
      }
    }

    // Replace your current text rendering section with this combined version:

    // Calculate dynamic font size based on cluster density
    const getTextSize = (node: GraphNode) => {
      if (!isClusteringEnabled) return "12px";
      
      // Count nodes in same cluster
      const sameClusterNodes = nodes.filter(n => 
        n.category === 'influence' && 
        n.clusters?.some(c => node.clusters?.includes(c))
      );
      
      if (sameClusterNodes.length > 4) return "10px"; // Smaller text for dense clusters
      if (sameClusterNodes.length > 2) return "11px";
      return "12px";
    };

    // Function to wrap text into multiple lines with truncation indicator
    const wrapText = (text: string, maxWidth: number, fontSize: string) => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      let remainingWords = [...words]; // Track remaining words
      
      // Estimate character width based on font size
      const charWidth = fontSize === "10px" ? 5.5 : fontSize === "11px" ? 6 : 6.5;
      const maxCharsPerLine = Math.floor(maxWidth / charWidth);
      
      // Process words for line 1
      while (remainingWords.length > 0 && lines.length < 1) {
        const word = remainingWords[0];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
          remainingWords.shift(); // Remove processed word
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = '';
          } else {
            // Single word is too long for line, truncate it
            lines.push(word.substring(0, maxCharsPerLine - 3) + "...");
            remainingWords.shift();
          }
        }
      }
      
      // Add first line if we have content
      if (currentLine && lines.length === 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      
      // Process words for line 2 (if there are remaining words)
      if (remainingWords.length > 0 && lines.length < 2) {
        while (remainingWords.length > 0) {
          const word = remainingWords[0];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          if (testLine.length <= maxCharsPerLine - (remainingWords.length > 1 ? 3 : 0)) {
            // Leave space for "..." if more words remain
            currentLine = testLine;
            remainingWords.shift();
          } else {
            break; // Can't fit more words
          }
        }
        
        // Add second line with "..." if needed
        if (currentLine) {
          if (remainingWords.length > 0) {
            // Add "..." if there are still words left
            if (currentLine.length <= maxCharsPerLine - 3) {
              lines.push(currentLine + "...");
            } else {
              // Trim current line to make room for "..."
              const trimmedLine = currentLine.substring(0, maxCharsPerLine - 3);
              const lastSpaceIndex = trimmedLine.lastIndexOf(' ');
              if (lastSpaceIndex > 0) {
                lines.push(trimmedLine.substring(0, lastSpaceIndex) + "...");
              } else {
                lines.push(trimmedLine + "...");
              }
            }
          } else {
            // No more words, just add the line as is
            lines.push(currentLine);
          }
        }
      }
      
      return lines;
    };

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

    // NEW: Draw cluster areas if clustering is enabled
    if (isClusteringEnabled) {
      const clusters = extractClusters(nodes.filter(n => n.category === 'influence'));
      
      if (clusters.length > 0) {
        const clustersPerRow = Math.ceil(Math.sqrt(clusters.length));
        const clusterAreaWidth = width - 100;
        const clusterAreaHeight = height - 250;
        const clusterWidth = clusterAreaWidth / clustersPerRow;
        const clusterHeight = clusterAreaHeight / Math.ceil(clusters.length / clustersPerRow);

        clusters.forEach((clusterName, clusterIndex) => {
          const clusterRow = Math.floor(clusterIndex / clustersPerRow);
          const clusterCol = clusterIndex % clustersPerRow;
          
          const clusterX = 50 + clusterCol * clusterWidth;
          const clusterY = 250 + clusterRow * clusterHeight;
          
          // Draw cluster background area (subtle)
          graphGroup.append("rect")
            .attr("x", clusterX + 10)
            .attr("y", clusterY + 10)
            .attr("width", clusterWidth - 20)
            .attr("height", clusterHeight - 20)
            .attr("fill", "#f3f4f6")
            .attr("stroke", "#e5e7eb")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("rx", 8)
            .attr("opacity", 0.5);
          
          // Add cluster label
          graphGroup.append("text")
            .attr("x", clusterX + clusterWidth / 2)
            .attr("y", clusterY + 30)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#6b7280")
            .text(clusterName);
        });
      }
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

    // Add multi-line labels with better spacing
    nodeGroups.each(function(d) {
      const group = d3.select(this);
      const fontSize = getTextSize(d);
      const maxWidth = isClusteringEnabled ? 100 : 120; // Smaller width in cluster mode
      const lines = wrapText(d.name, maxWidth, fontSize);
      
      // Calculate base offset with variation to reduce overlap
      const hash = d.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const baseVariation = (hash % 16) - 8; // Random variation between -8 and +8
      const baseOffset = 45 + baseVariation;
      
      // Calculate line height based on font size
      const lineHeight = fontSize === "10px" ? 12 : fontSize === "11px" ? 13 : 14;
      
      lines.forEach((line, i) => {
        group.append("text")
          .attr("dy", baseOffset + (i * lineHeight))
          .attr("text-anchor", "middle")
          .style("font-size", fontSize)
          .style("font-weight", "bold")
          .style("fill", "#374151")
          .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
          .text(line);
      });
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

    

    // Add year labels
    nodeGroups.filter(d => d.year)
      .append("text")
      .attr("dy", -35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#9ca3af")
      .text(d => d.year?.toString() || "");

    // Add category labels if in categorical mode (not clustering)
    if (isCategoricalLayout && !isClusteringEnabled) {
      const categories = extractCategories(nodes);
      let currentX = 80;
      const totalNodes = nodes.length;
      
      categories.forEach(({ type, count }) => {
        const proportion = count / totalNodes;
        const columnWidth = Math.max(150, (width - 160) * proportion);
        
        // Add category label
        graphGroup.append("text")
          .attr("x", currentX + columnWidth/2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("font-weight", "bold")
          .style("fill", "#374151")
          .text(`${type} (${count})`);
        
        // Add column separator line
        if (currentX > 80) {
          graphGroup.append("line")
            .attr("x1", currentX)
            .attr("y1", 50)
            .attr("x2", currentX)
            .attr("y2", height - 50)
            .attr("stroke", "#e5e7eb")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5");
        }
        
        currentX += columnWidth;
      });
    }

    // Auto-fit view if many new nodes were added
    if (currentNodeCount > previousNodeCount + 2) {
      setTimeout(() => {
        autoFitView(svg, nodes, width, height);
      }, 100);
    }

    setPreviousNodeCount(currentNodeCount);

  }, [accumulatedGraph, dimensions, onNodeClick, previousNodeCount, isChronologicalOrder, isCategoricalLayout, isClusteringEnabled]);

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        {/* NEW: Add clustering toggle button */}
        <button
          onClick={handleClusteringToggle}
          className={`px-3 py-2 border border-gray-300 rounded shadow text-sm ${
            isClusteringEnabled 
              ? 'bg-orange-500 text-white hover:bg-orange-600' 
              : 'bg-white hover:bg-gray-50'
          }`}
          title="Toggle clustering view (group by semantic clusters)"
        >
          🎯 Clusters
        </button>
        
        <button
          onClick={handleCategoricalToggle}
          className={`px-3 py-2 border border-gray-300 rounded shadow text-sm ${
            isCategoricalLayout 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-white hover:bg-gray-50'
          }`}
          title="Toggle categorical layout (group by type)"
        >
          📊 Categories
        </button>
        
        <button
          onClick={handleChronologicalToggle}
          className={`px-3 py-2 border border-gray-300 rounded shadow text-sm ${
            isChronologicalOrder 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-white hover:bg-gray-50'
          }`}
          title="Toggle chronological ordering (newest to oldest)"
        >
          📅 Chronological
        </button>
        
        <button
          onClick={handleFitToView}
          className="px-3 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-sm"
          title="Fit all nodes to view"
        >
          🔍 Fit to View
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
        <div className="font-semibold mb-2">Legend</div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span>Main Item</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span>Influences</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 bg-transparent mr-2"></div>
          <span>Selected</span>
        </div>
        {/* NEW: Add clustering legend */}
        {isClusteringEnabled && (
          <div className="flex items-center">
            <div className="w-4 h-4 border border-gray-400 bg-gray-100 mr-2" style={{borderStyle: 'dashed'}}></div>
            <span>Cluster Areas</span>
          </div>
        )}
      </div>

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded p-2 shadow text-sm">
        <div className="font-semibold">
          {accumulatedGraph.nodes.size} nodes
        </div>
        <div className="text-gray-600">
          {accumulatedGraph.relationships.size} connections
        </div>
        {/* NEW: Show cluster count if clustering enabled */}
        {isClusteringEnabled && (
          <div className="text-orange-600">
            {extractClusters(Array.from(accumulatedGraph.nodes.values()).filter(n => n.category === 'influence')).length} clusters
          </div>
        )}
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
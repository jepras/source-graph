"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Wand2, Plus, GripVertical } from "lucide-react"
import ItemDetailsPanel from "./item-details-panel"

interface Node {
  id: string
  name: string
  year: number
  type: string
  x: number
  y: number
  color: string
  cluster?: string
  aiEnriched?: boolean
}

interface Link {
  source: string
  target: string
}

interface Cluster {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
  nodes: string[]
}

interface KnowledgeGraphProps {
  selectedItem: string
  onItemSelect: (item: string) => void
}

const sampleClusters: Cluster[] = [
  {
    id: "cinematic",
    name: "Cinematic Style",
    x: 350,
    y: 200,
    width: 200,
    height: 150,
    color: "#ef4444",
    nodes: ["shaft", "crime-pays"],
  },
  {
    id: "musical",
    name: "Musical Innovation",
    x: 100,
    y: 100,
    width: 180,
    height: 120,
    color: "#f97316",
    nodes: ["jdilla", "jazz-music"],
  },
  {
    id: "character",
    name: "Character Development",
    x: 600,
    y: 150,
    width: 160,
    height: 140,
    color: "#f43f5e",
    nodes: ["urban-grit"],
  },
  {
    id: "cultural",
    name: "Cultural Impact",
    x: 50,
    y: 400,
    width: 200,
    height: 160,
    color: "#e11d48",
    nodes: ["blaxploitation", "visual-imagery"],
  },
  {
    id: "narrative",
    name: "Narrative Structure",
    x: 550,
    y: 450,
    width: 180,
    height: 120,
    color: "#be123c",
    nodes: ["french-new-wave", "narrative-themes"],
  },
]

const sampleNodes: Node[] = [
  {
    id: "shaft",
    name: "Shaft",
    year: 1971,
    type: "film",
    x: 450,
    y: 275,
    color: "#ef4444",
    cluster: "cinematic",
    aiEnriched: true,
  },
  {
    id: "jdilla",
    name: "J Dilla's Production",
    year: 2006,
    type: "music",
    x: 190,
    y: 160,
    color: "#f97316",
    cluster: "musical",
    aiEnriched: true,
  },
  {
    id: "crime-pays",
    name: "Crime Pays",
    year: 1971,
    type: "film",
    x: 400,
    y: 250,
    color: "#ef4444",
    cluster: "cinematic",
    aiEnriched: false,
  },
  {
    id: "blaxploitation",
    name: "Blaxploitation Movement",
    year: 1971,
    type: "movement",
    x: 150,
    y: 480,
    color: "#e11d48",
    cluster: "cultural",
    aiEnriched: true,
  },
  {
    id: "french-new-wave",
    name: "French New Wave",
    year: 1959,
    type: "movement",
    x: 640,
    y: 510,
    color: "#be123c",
    cluster: "narrative",
    aiEnriched: true,
  },
  {
    id: "jazz-music",
    name: "Jazz Music",
    year: 1950,
    type: "music",
    x: 160,
    y: 140,
    color: "#f97316",
    cluster: "musical",
    aiEnriched: false,
  },
  {
    id: "urban-grit",
    name: "Urban Grit",
    year: 2006,
    type: "theme",
    x: 680,
    y: 220,
    color: "#f43f5e",
    cluster: "character",
    aiEnriched: false,
  },
  {
    id: "narrative-themes",
    name: "Narrative Themes",
    year: 1970,
    type: "theme",
    x: 620,
    y: 490,
    color: "#be123c",
    cluster: "narrative",
    aiEnriched: true,
  },
  {
    id: "visual-imagery",
    name: "Visual Imagery",
    year: 1965,
    type: "theme",
    x: 200,
    y: 450,
    color: "#e11d48",
    cluster: "cultural",
    aiEnriched: false,
  },
]

const sampleLinks: Link[] = [
  { source: "shaft", target: "jdilla" },
  { source: "shaft", target: "crime-pays" },
  { source: "shaft", target: "blaxploitation" },
  { source: "blaxploitation", target: "french-new-wave" },
  { source: "blaxploitation", target: "jazz-music" },
  { source: "jdilla", target: "urban-grit" },
  { source: "shaft", target: "narrative-themes" },
  { source: "shaft", target: "visual-imagery" },
]

export default function KnowledgeGraph({ selectedItem, onItemSelect }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewMode, setViewMode] = useState<"clusters" | "chronological">("clusters")
  const [showControls, setShowControls] = useState(false)
  const [showSelectedPanel, setShowSelectedPanel] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>(sampleClusters)
  const [nodes, setNodes] = useState<Node[]>(sampleNodes)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)

  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Add node descriptions
  const nodeDescriptions: { [key: string]: string } = {
    shaft: "Groundbreaking blaxploitation film that redefined urban cinema",
    jdilla: "Revolutionary hip-hop producer known for innovative sampling",
    "crime-pays": "Classic crime drama with gritty visual storytelling",
    blaxploitation: "Film movement celebrating African American culture",
    "french-new-wave": "Influential cinema movement emphasizing artistic freedom",
    "jazz-music": "Musical genre that influenced film scoring techniques",
    "urban-grit": "Aesthetic style emphasizing raw city authenticity",
    "narrative-themes": "Storytelling elements that shape cultural impact",
    "visual-imagery": "Cinematic techniques that create lasting impressions",
  }

  const handleRetrieveClusters = () => {
    // Mock AI cluster generation
    const newClusters: Cluster[] = [
      {
        id: "visual",
        name: "Visual Innovation",
        x: 300,
        y: 150,
        width: 220,
        height: 180,
        color: "#ef4444",
        nodes: ["shaft", "crime-pays"],
      },
      {
        id: "sound",
        name: "Sound & Music",
        x: 80,
        y: 120,
        width: 200,
        height: 160,
        color: "#f97316",
        nodes: ["jdilla", "jazz-music"],
      },
      {
        id: "social",
        name: "Social Impact",
        x: 100,
        y: 350,
        width: 250,
        height: 200,
        color: "#e11d48",
        nodes: ["blaxploitation", "visual-imagery"],
      },
      {
        id: "technique",
        name: "Film Technique",
        x: 580,
        y: 200,
        width: 180,
        height: 300,
        color: "#be123c",
        nodes: ["french-new-wave", "narrative-themes", "urban-grit"],
      },
    ]

    setClusters(newClusters)

    // Reassign nodes to new clusters and sort chronologically globally
    const updatedNodes = nodes
      .map((node) => {
        const newCluster = newClusters.find((cluster) => cluster.nodes.includes(node.id))
        return { ...node, cluster: newCluster?.id }
      })
      .sort((a, b) => a.year - b.year) // Global chronological sort

    setNodes(updatedNodes)
  }

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedNode(nodeId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, clusterId: string) => {
    e.preventDefault()
    if (draggedNode) {
      // Update clusters
      setClusters((prev) =>
        prev.map((cluster) => ({
          ...cluster,
          nodes:
            cluster.id === clusterId
              ? [...cluster.nodes.filter((id) => id !== draggedNode), draggedNode]
              : cluster.nodes.filter((id) => id !== draggedNode),
        })),
      )

      // Update nodes and maintain global chronological order
      setNodes((prev) => {
        const updated = prev.map((node) => (node.id === draggedNode ? { ...node, cluster: clusterId } : node))
        return updated.sort((a, b) => a.year - b.year) // Global chronological sort
      })

      setDraggedNode(null)
    }
  }

  const createNewCluster = () => {
    const newCluster: Cluster = {
      id: `cluster-${Date.now()}`,
      name: "New Cluster",
      x: 400,
      y: 300,
      width: 150,
      height: 100,
      color: "#6366f1",
      nodes: [],
    }
    setClusters((prev) => [...prev, newCluster])
  }

  // Get nodes sorted chronologically for display in drag & drop
  const getChronologicalNodes = () => {
    return [...nodes].sort((a, b) => a.year - b.year)
  }

  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current
    svg.innerHTML = ""

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    svg.appendChild(g)

    // Draw cluster boundaries
    clusters.forEach((cluster) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", cluster.x.toString())
      rect.setAttribute("y", cluster.y.toString())
      rect.setAttribute("width", cluster.width.toString())
      rect.setAttribute("height", cluster.height.toString())
      rect.setAttribute("fill", "none")
      rect.setAttribute("stroke", cluster.color)
      rect.setAttribute("stroke-width", "2")
      rect.setAttribute("stroke-dasharray", "5,5")
      rect.setAttribute("rx", "8")
      g.appendChild(rect)

      // Cluster labels
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
      text.setAttribute("x", (cluster.x + cluster.width / 2).toString())
      text.setAttribute("y", (cluster.y - 10).toString())
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("font-size", "14")
      text.setAttribute("font-weight", "600")
      text.setAttribute("fill", cluster.color)
      text.textContent = cluster.name
      g.appendChild(text)
    })

    // Draw links
    sampleLinks.forEach((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source)
      const targetNode = nodes.find((n) => n.id === link.target)

      if (sourceNode && targetNode) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("x1", sourceNode.x.toString())
        line.setAttribute("y1", sourceNode.y.toString())
        line.setAttribute("x2", targetNode.x.toString())
        line.setAttribute("y2", targetNode.y.toString())
        line.setAttribute("stroke", "#374151")
        line.setAttribute("stroke-width", "2")
        line.setAttribute("opacity", "0.6")
        g.appendChild(line)
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
      circle.setAttribute("cx", node.x.toString())
      circle.setAttribute("cy", node.y.toString())
      circle.setAttribute("r", node.id === "shaft" ? "25" : "20")
      circle.setAttribute("fill", node.color)
      circle.setAttribute("stroke", node.id === selectedItem.toLowerCase() ? "#ffffff" : "#1f2937")
      circle.setAttribute("stroke-width", node.id === selectedItem.toLowerCase() ? "3" : "2")
      circle.style.cursor = "pointer"

      // Add AI enrichment indicator
      if (node.aiEnriched) {
        const aiIndicator = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        aiIndicator.setAttribute("cx", (node.x + 15).toString())
        aiIndicator.setAttribute("cy", (node.y - 15).toString())
        aiIndicator.setAttribute("r", "6")
        aiIndicator.setAttribute("fill", "#10b981")
        aiIndicator.setAttribute("stroke", "#065f46")
        aiIndicator.setAttribute("stroke-width", "2")
        g.appendChild(aiIndicator)

        // Add sparkle icon
        const sparkle = document.createElementNS("http://www.w3.org/2000/svg", "text")
        sparkle.setAttribute("x", (node.x + 15).toString())
        sparkle.setAttribute("y", (node.y - 11).toString())
        sparkle.setAttribute("text-anchor", "middle")
        sparkle.setAttribute("font-size", "8")
        sparkle.setAttribute("fill", "white")
        sparkle.textContent = "✨"
        g.appendChild(sparkle)
      }

      // Add hover event handlers
      circle.addEventListener("mouseenter", (e) => {
        setHoveredNode(node)
        setMousePosition({ x: e.clientX, y: e.clientY })
      })

      circle.addEventListener("mousemove", (e) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      })

      circle.addEventListener("mouseleave", () => {
        setHoveredNode(null)
      })

      circle.addEventListener("click", () => {
        onItemSelect(node.name)
        setShowSelectedPanel(true)
      })

      g.appendChild(circle)

      // Add labels
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
      text.setAttribute("x", node.x.toString())
      text.setAttribute("y", (node.y + 35).toString())
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("font-size", "12")
      text.setAttribute("font-weight", "500")
      text.setAttribute("fill", "#e5e7eb")
      text.textContent = node.name
      g.appendChild(text)

      // Add year labels
      const yearText = document.createElementNS("http://www.w3.org/2000/svg", "text")
      yearText.setAttribute("x", node.x.toString())
      yearText.setAttribute("y", (node.y + 50).toString())
      yearText.setAttribute("text-anchor", "middle")
      yearText.setAttribute("font-size", "10")
      yearText.setAttribute("fill", "#9ca3af")
      yearText.textContent = node.year.toString()
      g.appendChild(yearText)
    })
  }, [selectedItem, clusters, nodes])

  return (
    <div className="h-full flex bg-black relative">
      {/* Main Graph Area */}
      <div className={`transition-all duration-300 ${showSelectedPanel ? "flex-1" : "w-full"}`}>
        <div className="h-full relative overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" viewBox="0 0 800 700" />

          {/* Floating Controls Button */}
          <div className="absolute top-4 left-4">
            <Button
              size="sm"
              variant="outline"
              className="bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs px-3 py-1.5"
              onClick={() => setShowControls(!showControls)}
            >
              Graph Controls
            </Button>

            {/* Floating Controls Panel */}
            {showControls && (
              <Card className="absolute top-10 left-0 w-80 shadow-xl z-10 bg-[#0a0a0a] border-[#1a1a1a]">
                <CardContent className="p-3">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-200 mb-2">View Mode</h4>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant={viewMode === "clusters" ? "default" : "outline"}
                          onClick={() => setViewMode("clusters")}
                          className={`flex-1 text-xs py-1 h-7 ${
                            viewMode === "clusters"
                              ? "bg-primary hover:bg-primary/90 text-white border-0"
                              : "bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a]"
                          }`}
                        >
                          🔗 Clusters
                        </Button>
                        <Button
                          size="sm"
                          variant={viewMode === "chronological" ? "default" : "outline"}
                          onClick={() => setViewMode("chronological")}
                          className={`flex-1 text-xs py-1 h-7 ${
                            viewMode === "chronological"
                              ? "bg-primary hover:bg-primary/90 text-white border-0"
                              : "bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a]"
                          }`}
                        >
                          📅 Timeline
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-200 mb-2">Graph Actions</h4>
                      <div className="grid grid-cols-1 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-start bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs py-1 h-7"
                        >
                          🧹 Clear Graph
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="justify-start bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs py-1 h-7"
                          >
                            🔄 Reset
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="justify-start bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs py-1 h-7"
                          >
                            📊 Export
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-200 mb-2">AI Cluster Tools</h4>
                      <div className="space-y-1">
                        <Button
                          size="sm"
                          onClick={handleRetrieveClusters}
                          className="w-full justify-start bg-primary hover:bg-primary/90 text-white text-xs py-1 h-7"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Retrieve clusters
                        </Button>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={createNewCluster}
                            className="justify-start bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs py-1 h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            New
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="justify-start bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs py-1 h-7"
                          >
                            🎯 Auto
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Drag and Drop Cluster Management */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-200 mb-2">Drag & Drop Management</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {clusters.map((cluster) => (
                          <div
                            key={cluster.id}
                            className="bg-[#121212] border border-[#1a1a1a] rounded p-2"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, cluster.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium" style={{ color: cluster.color }}>
                                {cluster.name}
                              </span>
                              <span className="text-xs text-gray-500">{cluster.nodes.length} nodes</span>
                            </div>
                            <div className="space-y-1">
                              {getChronologicalNodes()
                                .filter((node) => cluster.nodes.includes(node.id))
                                .map((node) => (
                                  <div
                                    key={node.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, node.id)}
                                    className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white cursor-move bg-[#0a0a0a] rounded px-1 py-0.5"
                                  >
                                    <GripVertical className="w-2 h-2" />
                                    <span className="truncate">{node.name}</span>
                                    {node.aiEnriched && <span className="text-green-400">✨</span>}
                                    <span className="text-gray-500 text-[10px]">({node.year})</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-800/50 pt-2">
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>
                          <span className="font-medium text-gray-300">{nodes.length} nodes</span> •{" "}
                          <span>{sampleLinks.length} connections</span>
                        </div>
                        <div>
                          <span>{clusters.length} clusters</span> •{" "}
                          <span>{nodes.filter((n) => n.aiEnriched).length} AI-enriched</span>
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
              className="bg-[#0a0a0a] border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] text-xs px-3 py-1.5"
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
        className={`transition-all duration-300 border-l border-[#1a1a1a] bg-[#0a0a0a] ${
          showSelectedPanel ? "w-96" : "w-0 overflow-hidden"
        }`}
      >
        {showSelectedPanel && (
          <ItemDetailsPanel selectedItem={selectedItem} onClose={() => setShowSelectedPanel(false)} />
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
          <div className="bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hoveredNode.color }} />
              <h4 className="text-sm font-medium text-white truncate">{hoveredNode.name}</h4>
              <span className="text-xs text-gray-500">({hoveredNode.year})</span>
              {hoveredNode.aiEnriched && <span className="text-green-400 text-xs">✨</span>}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {nodeDescriptions[hoveredNode.id] || "Cultural influence node"}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-gray-500 bg-[#121212] px-1.5 py-0.5 rounded">{hoveredNode.type}</span>
              {hoveredNode.cluster && (
                <span className="text-xs text-gray-500 bg-[#121212] px-1.5 py-0.5 rounded">{hoveredNode.cluster}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

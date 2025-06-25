"use client"

import { useState } from "react"
import TopPanel from "@/components/top-panel"
import ResearchPanel from "@/components/research-panel"
import KnowledgeGraph from "@/components/knowledge-graph"

export default function InfluenceGraphApp() {
  const [selectedItem, setSelectedItem] = useState("Shaft")
  const [documentContent, setDocumentContent] = useState("")

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Top Panel */}
      <TopPanel selectedItem={selectedItem} />

      {/* Bottom Split Panel */}
      <div className="flex-1 flex">
        {/* Left Research Panel - 50% */}
        <div className="w-1/2 border-r border-gray-800">
          <ResearchPanel documentContent={documentContent} setDocumentContent={setDocumentContent} />
        </div>

        {/* Right Knowledge Graph - 50% */}
        <div className="w-1/2">
          <KnowledgeGraph selectedItem={selectedItem} onItemSelect={setSelectedItem} />
        </div>
      </div>
    </div>
  )
}

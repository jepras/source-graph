"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, RotateCcw, Check } from "lucide-react"

// Sample initial content
const initialContent = [
  { type: "title", content: "Shaft (1971)", id: "1" },
  {
    type: "intro",
    content:
      'Blaxploitation films of the 1970s, exemplified by movies like "Shaft" (1971), created a revolutionary template that continues to influence contemporary cinema in profound ways. The gritty urban cinematography pioneered in blaxploitation films established visual conventions that persist in modern crime dramas.',
    id: "2",
  },
  {
    type: "influence",
    content: "The French Connection",
    tags: ["macro", "cinematic", "1971"],
    description: "Pioneered handheld camera work and natural lighting techniques that influenced Shaft's visual style.",
    id: "3",
  },
  {
    type: "influence",
    content: "Isaac Hayes' Musical Innovation",
    tags: ["micro", "musical", "1969"],
    description:
      "Revolutionary funk and soul integration into film scoring that became the template for Shaft's iconic soundtrack.",
    id: "4",
  },
  {
    type: "influence",
    content: "Urban Realism Movement",
    tags: ["macro", "cultural", "1968"],
    description: "Authentic street-level perspective and social commentary that shaped Shaft's narrative approach.",
    id: "5",
  },
  {
    type: "influence",
    content: "Detective Archetype Evolution",
    tags: ["nano", "character", "1970"],
    description:
      "The 'cool' protagonist operating outside traditional authority structures, establishing the modern action hero template.",
    id: "6",
  },
  {
    type: "influence",
    content: "Cinematographic Techniques",
    tags: ["micro", "cinematic", "1970"],
    description:
      "Innovative use of lighting and camera angles that created the visual language for urban crime dramas.",
    id: "7",
  },
]

interface ContentBlock {
  type: "title" | "intro" | "influence"
  content: string
  id: string
  tags?: string[]
  description?: string
}

export default function CanvasEditor() {
  const [content, setContent] = useState<ContentBlock[]>(initialContent)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const mockAIActions = {
    expand: (blockId: string) => {
      setContent((prev) =>
        prev.map((block) => {
          if (block.id === blockId && block.type === "influence") {
            return {
              ...block,
              description:
                block.description +
                " This influence can be seen in the way modern filmmakers approach character development, often drawing from the complex anti-hero archetypes that this work pioneered.",
            }
          }
          return block
        }),
      )

      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement
      if (element) {
        element.style.backgroundColor = "#065f46"
        setTimeout(() => {
          element.style.backgroundColor = "transparent"
        }, 2000)
      }
      setShowActionMenu(null)
    },

    edit: (blockId: string) => {
      setContent((prev) =>
        prev.map((block) => {
          if (block.id === blockId) {
            return {
              ...block,
              content: block.content.replace(/\b(influence|influenced)\b/g, "profoundly shaped"),
              description: block.description?.replace(/\b(influence|influenced)\b/g, "profoundly shaped"),
            }
          }
          return block
        }),
      )

      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement
      if (element) {
        element.style.backgroundColor = "#064e3b"
        setTimeout(() => {
          element.style.backgroundColor = "transparent"
        }, 2000)
      }
      setShowActionMenu(null)
    },

    delete: (blockId: string) => {
      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement
      if (element) {
        element.style.opacity = "0.5"
        element.style.textDecoration = "line-through"
        setTimeout(() => {
          setContent((prev) => prev.filter((block) => block.id !== blockId))
        }, 1000)
      }
      setShowActionMenu(null)
    },

    addToGraph: (blockId: string) => {
      // Mock action for adding to graph
      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement
      if (element) {
        element.style.backgroundColor = "#0f766e"
        setTimeout(() => {
          element.style.backgroundColor = "transparent"
        }, 2000)
      }
      setShowActionMenu(null)
    },
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "macro":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "micro":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "nano":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30"
      case "cinematic":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "musical":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "cultural":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "character":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const renderBlock = (block: ContentBlock) => {
    const showingMenu = showActionMenu === block.id

    return (
      <div key={block.id} className="relative group">
        <div className="flex items-start">
          <div className="flex-1 min-w-0">
            {block.type === "title" && (
              <h1
                data-block-id={block.id}
                className="text-3xl font-bold mb-6 text-white p-2 rounded-md transition-colors"
              >
                {block.content}
              </h1>
            )}
            {block.type === "intro" && (
              <p
                data-block-id={block.id}
                className="mb-6 text-gray-300 leading-relaxed text-lg p-2 rounded-md transition-colors"
              >
                {block.content}
              </p>
            )}
            {block.type === "influence" && (
              <div
                data-block-id={block.id}
                className="mb-4 p-4 rounded-lg transition-all duration-200 hover:bg-[#121212] hover:border hover:border-[#1a1a1a] cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{block.content}</h3>
                <p className="text-gray-400 leading-relaxed mb-3">{block.description}</p>
                <div className="flex flex-wrap gap-2">
                  {block.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline" className={`text-xs ${getTagColor(tag)}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Static Action Button */}
          <div className="flex-shrink-0 ml-4 mt-2">
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="w-6 h-6 p-0 bg-gray-950/90 backdrop-blur-sm shadow-lg border-gray-700/50 text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 rounded-full"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActionMenu(showingMenu ? null : block.id)
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>

              {/* Action Menu */}
              {showingMenu && (
                <div className="absolute top-0 right-8 bg-gray-950/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-50 min-w-48">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => mockAIActions.expand(block.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary/20 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Refine section</span>
                    </button>
                    <button
                      onClick={() => mockAIActions.addToGraph(block.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary/20 rounded-md transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Add to graph</span>
                    </button>
                    <button
                      onClick={() => mockAIActions.edit(block.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-primary/20 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit text</span>
                    </button>
                    <button
                      onClick={() => mockAIActions.delete(block.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/20 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 relative" ref={editorRef}>
        <div className="h-full p-6 overflow-y-auto prose prose-lg max-w-none prose-invert">
          {content.map(renderBlock)}
        </div>
      </div>
    </div>
  )
}

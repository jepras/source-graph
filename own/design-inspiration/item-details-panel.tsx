"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { X, Wand2, ExternalLink, Music, Film, BookOpen, Info, Share2, Edit, Trash2, ChevronDown } from "lucide-react"

interface ItemDetailsPanelProps {
  selectedItem: string
  onClose: () => void
}

interface AIContentItem {
  id: string
  type: "spotify" | "youtube" | "wikipedia" | "image" | "imdb" | "genius"
  title: string
  description?: string
  url?: string
  thumbnail?: string
  isLoading?: boolean
}

interface ResearchLogItem {
  id: string
  timestamp: string
  user: string
  action: string
  details: string
  status: "Added" | "Generated" | "Edited" | "Completed"
  expanded?: boolean
}

export default function ItemDetailsPanel({ selectedItem, onClose }: ItemDetailsPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiContent, setAiContent] = useState<AIContentItem[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [showFullDetails, setShowFullDetails] = useState<{ [key: string]: boolean }>({})

  // Mock data for the selected item
  const itemData = {
    name: selectedItem,
    year: selectedItem === "Shaft" ? 1971 : selectedItem === "J Dilla's Production" ? 2006 : 1970,
    type: selectedItem === "Shaft" ? "film" : selectedItem === "J Dilla's Production" ? "music" : "concept",
    description:
      selectedItem === "Shaft"
        ? "A classic blaxploitation film following a private detective in Harlem. Directed by Gordon Parks and starring Richard Roundtree, it established many conventions of the genre."
        : selectedItem === "J Dilla's Production"
          ? "J Dilla (James Dewitt Yancey) was an influential hip hop producer known for his innovative sampling techniques and rhythmic complexity. His work has influenced countless producers and artists."
          : "A cultural movement or concept that has influenced various forms of media and art.",
    tags: selectedItem === "Shaft" ? ["Visual Style", "Character", "Music"] : ["Production", "Sampling", "Rhythm"],
    scope: selectedItem === "Shaft" ? "macro" : selectedItem === "J Dilla's Production" ? "micro" : "nano",
    influences: selectedItem === "Shaft" ? ["The French Connection", "Dirty Harry"] : ["Madlib", "Pete Rock"],
    influencedBy: selectedItem === "Shaft" ? ["Black Dynamite", "Jackie Brown"] : ["Flying Lotus", "Kaytranada"],
  }

  const researchLog: ResearchLogItem[] = [
    {
      id: "1",
      timestamp: "2024-01-20 14:30",
      user: "Alice",
      action: "Created",
      details: "Initial item creation with basic details.",
      status: "Added",
      expanded: false,
    },
    {
      id: "2",
      timestamp: "2024-01-21 09:15",
      user: "Bob",
      action: "Updated",
      details: "Added a more detailed description and influence categories.",
      status: "Edited",
      expanded: false,
    },
    {
      id: "3",
      timestamp: "2024-01-22 16:45",
      user: "Alice",
      action: "Generated",
      details: "AI-generated content added to the overview.",
      status: "Generated",
      expanded: false,
    },
    {
      id: "4",
      timestamp: "2024-01-23 11:00",
      user: "Charlie",
      action: "Linked",
      details: "Connected to related items in the knowledge graph.",
      status: "Completed",
      expanded: false,
    },
  ]

  const handleGenerateContent = () => {
    setIsGenerating(true)

    // Simulate API call delay
    setTimeout(() => {
      // Mock AI-generated content based on the selected item
      if (selectedItem === "Shaft") {
        setAiContent([
          {
            id: "1",
            type: "spotify",
            title: "Theme from Shaft by Isaac Hayes",
            description: "The iconic soundtrack that defined a genre",
            url: "https://open.spotify.com/track/3g8nKGVw3LD4wfJjKMJS2I",
            thumbnail: "/placeholder.svg?height=80&width=80",
          },
          {
            id: "2",
            type: "youtube",
            title: "Shaft (1971) - Trailer",
            description: "Original theatrical trailer for the groundbreaking film",
            url: "https://www.youtube.com/watch?v=NiCB2isZcRM",
            thumbnail: "/placeholder.svg?height=120&width=200",
          },
          {
            id: "3",
            type: "imdb",
            title: "Shaft (1971)",
            description: "7.0/10 · Crime, Action, Thriller · 1h 40m",
            url: "https://www.imdb.com/title/tt0067741/",
            thumbnail: "/placeholder.svg?height=120&width=80",
          },
          {
            id: "4",
            type: "image",
            title: "Visual Style Evolution",
            description: "How Shaft's cinematography influenced modern urban filmmaking",
            thumbnail: "/placeholder.svg?height=200&width=300",
          },
          {
            id: "5",
            type: "wikipedia",
            title: "Blaxploitation",
            description: "Film genre that emerged in the United States in the early 1970s",
            url: "https://en.wikipedia.org/wiki/Blaxploitation",
          },
        ])
      } else if (selectedItem === "J Dilla's Production") {
        setAiContent([
          {
            id: "1",
            type: "spotify",
            title: "Donuts by J Dilla",
            description: "Groundbreaking instrumental hip-hop album",
            url: "https://open.spotify.com/album/5fMlysqhFE0itGn4KezMBW",
            thumbnail: "/placeholder.svg?height=80&width=80",
          },
          {
            id: "2",
            type: "youtube",
            title: "J Dilla's Sampling Technique Explained",
            description: "Analysis of his unique production style",
            url: "https://www.youtube.com/watch?v=SENzTt3ftiU",
            thumbnail: "/placeholder.svg?height=120&width=200",
          },
          {
            id: "3",
            type: "genius",
            title: "J Dilla's Production Techniques",
            description: "Deep dive into his influential style",
            url: "https://genius.com/discussions/281920-The-5-most-influential-producers-of-all-time",
          },
          {
            id: "4",
            type: "image",
            title: "Evolution of Sampling",
            description: "How J Dilla transformed the art of sampling in hip-hop",
            thumbnail: "/placeholder.svg?height=200&width=300",
          },
        ])
      } else {
        setAiContent([
          {
            id: "1",
            type: "wikipedia",
            title: `${selectedItem}`,
            description: "Information about this concept or movement",
            url: "https://en.wikipedia.org/wiki/Main_Page",
          },
          {
            id: "2",
            type: "image",
            title: `${selectedItem} Visualization`,
            description: "AI-generated representation of this concept",
            thumbnail: "/placeholder.svg?height=200&width=300",
          },
        ])
      }

      setIsGenerating(false)
    }, 2000)
  }

  const toggleHistoryEntry = (id: string) => {
    setShowFullDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const getHistoryIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "➕"
      case "updated":
        return "✏️"
      case "generated":
        return "🤖"
      case "linked":
        return "🔗"
      default:
        return "📝"
    }
  }

  const renderContentItem = (item: AIContentItem) => {
    switch (item.type) {
      case "spotify":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a]">
            <div className="flex items-center p-3">
              <div className="flex-shrink-0 mr-3">
                <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-12 h-12 rounded" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              <Button size="sm" variant="ghost" className="ml-2 text-green-500 hover:text-green-400 hover:bg-[#1a1a1a]">
                <Music className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )

      case "youtube":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a]">
            <div className="aspect-video bg-black relative">
              <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[16px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </div>
          </div>
        )

      case "imdb":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a] p-3">
            <div className="flex">
              <div className="flex-shrink-0 mr-3">
                <img
                  src={item.thumbnail || "/placeholder.svg"}
                  alt={item.title}
                  className="w-12 h-18 rounded object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="text-sm font-medium text-white">{item.title}</h4>
                  <Badge
                    variant="outline"
                    className="ml-2 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px]"
                  >
                    IMDb
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 text-xs text-gray-300 hover:text-white hover:bg-[#1a1a1a]"
                >
                  <Film className="w-3 h-3 mr-1" /> View details
                </Button>
              </div>
            </div>
          </div>
        )

      case "wikipedia":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a] p-3">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        )

      case "image":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a]">
            <div className="aspect-video bg-black">
              <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
            </div>
          </div>
        )

      case "genius":
        return (
          <div className="bg-[#121212] rounded-md overflow-hidden border border-[#1a1a1a] p-3">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mr-3">
                <span className="text-black font-bold text-xs">G</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#1a1a1a]">
        <h3 className="font-medium text-white">Item Details</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="w-6 h-6 p-0 text-gray-400 hover:text-white hover:bg-[#1a1a1a] rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-[#121212]">
              <TabsTrigger
                value="overview"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="connections"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Connections
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 pt-6 space-y-6">
            {/* Title and Type */}
            <div>
              <h2 className="text-xl font-bold text-white">{itemData.name}</h2>
              <div className="flex items-center mt-1 space-x-2">
                <span className="text-sm text-gray-400">{itemData.year}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {itemData.scope}
                </Badge>
                <span className="text-gray-500">•</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {itemData.type}
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-[#121212] border-[#1a1a1a] hover:bg-[#1a1a1a] text-xs text-gray-400 hover:text-white"
              >
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-[#121212] border-[#1a1a1a] hover:bg-[#1a1a1a] text-xs text-gray-400 hover:text-white"
              >
                <Share2 className="w-3 h-3 mr-1" /> Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-[#121212] border-[#1a1a1a] hover:bg-destructive/20 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Info className="w-3 h-3 mr-1" /> Description
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{itemData.description}</p>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Clusters</h3>
              <div className="flex flex-wrap gap-1">
                {itemData.tags.map((tag, index) => (
                  <Badge key={index} className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* AI Content Generator */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center">
                  <Wand2 className="w-3 h-3 mr-1" /> AI-Generated Content
                </h3>
                <Button
                  size="sm"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-white"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>

              {isGenerating ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-[#121212]" />
                  <Skeleton className="h-40 w-full bg-[#121212]" />
                  <Skeleton className="h-20 w-full bg-[#121212]" />
                </div>
              ) : aiContent.length > 0 ? (
                <div className="space-y-3">
                  {aiContent.map((item) => (
                    <div key={item.id}>{renderContentItem(item)}</div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#121212] border border-[#1a1a1a] rounded-md p-4 text-center">
                  <Wand2 className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    Click "Generate" to discover related content from various sources
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Includes Spotify, YouTube, Wikipedia, IMDB, and more</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connections" className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Influences</h3>
                {itemData.influences.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-400">
                    {itemData.influences.map((influence, index) => (
                      <li key={index}>{influence}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No known influences.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Influenced By</h3>
                {itemData.influencedBy.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-gray-400">
                    {itemData.influencedBy.map((influenced, index) => (
                      <li key={index}>{influenced}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No known items influenced by this.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <div className="bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3 border-b border-[#1a1a1a] pb-2">
                  <h4 className="text-sm font-medium text-white">Item History</h4>
                  <div className="flex space-x-2">
                    <span className="text-xs text-gray-400 bg-[#121212] px-2 py-1 rounded">Latest</span>
                    <span className="text-xs text-gray-500 bg-[#0a0a0a] px-2 py-1 rounded border border-[#1a1a1a]">
                      Viewing
                    </span>
                  </div>
                </div>
                <div className="space-y-0 max-h-60 overflow-y-auto">
                  {researchLog.map((entry, index) => (
                    <div key={entry.id}>
                      <button
                        onClick={() => toggleHistoryEntry(entry.id)}
                        className="w-full flex items-start space-x-3 py-2 hover:bg-[#121212] rounded transition-colors"
                      >
                        {/* Timeline thread */}
                        <div className="flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-[#1a1a1a] border-2 border-primary flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">{getHistoryIcon(entry.action)}</span>
                          </div>
                          {index < researchLog.length - 1 && <div className="w-0.5 h-6 bg-[#1a1a1a] mt-1"></div>}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-300 truncate">
                              {entry.user} - {entry.action}
                            </p>
                            <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                              <span className="text-xs text-gray-500">{entry.status}</span>
                              <ChevronDown
                                className={`w-3 h-3 text-gray-500 transition-transform ${
                                  showFullDetails[entry.id] ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">{entry.timestamp}</p>
                        </div>
                      </button>
                      {showFullDetails[entry.id] && (
                        <div className="ml-8 pb-2">
                          <p className="text-xs text-gray-500 leading-relaxed">{entry.details}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

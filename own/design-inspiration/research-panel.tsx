"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ChevronDown, ChevronUp, Activity, Lightbulb } from "lucide-react"
import CanvasEditor from "./canvas-editor"

interface ResearchPanelProps {
  documentContent: string
  setDocumentContent: (content: string) => void
}

interface AILogEntry {
  id: string
  timestamp: string
  type: "thinking" | "action" | "observation" | "user_input"
  content: string
  details?: string
  status: "Added" | "Generated" | "Edited" | "Completed"
  expanded?: boolean
}

const mockAILog: AILogEntry[] = [
  {
    id: "1",
    timestamp: "14:32:15",
    type: "user_input",
    content: "Research influences for Shaft (1971)",
    status: "Added",
    expanded: false,
  },
  {
    id: "2",
    timestamp: "14:32:16",
    type: "thinking",
    content: "Analyzing blaxploitation cinema influences...",
    details:
      "Need to research visual style, musical innovation, character archetypes, and cultural impact of Shaft (1971)",
    status: "Generated",
    expanded: false,
  },
  {
    id: "3",
    timestamp: "14:32:18",
    type: "action",
    content: "Generated research document structure",
    details: "Created sections for Visual Style, Musical Innovation, Character Archetypes, and Cultural Impact",
    status: "Completed",
    expanded: false,
  },
  {
    id: "4",
    timestamp: "14:32:45",
    type: "user_input",
    content: "Expand paragraph about visual style",
    status: "Added",
    expanded: false,
  },
  {
    id: "5",
    timestamp: "14:32:46",
    type: "action",
    content: "Expanded visual style paragraph",
    details: "Added information about handheld cameras and natural lighting techniques",
    status: "Edited",
    expanded: false,
  },
  {
    id: "6",
    timestamp: "14:33:12",
    type: "observation",
    content: "User is focusing on cinematographic techniques",
    details: "Multiple expansions requested for visual and technical aspects",
    status: "Generated",
    expanded: false,
  },
]

const suggestions = [
  "How did Shaft influence modern action heroes?",
  "What musical elements from Shaft appear in contemporary films?",
  "Compare Shaft's cinematography to modern crime dramas",
  "Analyze the cultural impact of blaxploitation on today's cinema",
  "What visual techniques from French New Wave influenced Shaft?",
]

export default function ResearchPanel({ documentContent, setDocumentContent }: ResearchPanelProps) {
  const [chatInput, setChatInput] = useState("")
  const [isDocumentMode, setIsDocumentMode] = useState(false)
  const [systemPrompt, setSystemPrompt] =
    useState(`You are an AI research assistant specializing in influence mapping and cultural analysis. When researching influences:

1. Focus on concrete, verifiable connections between works
2. Organize findings into clear categories (Visual Style, Musical Innovation, Character Archetypes, etc.)
3. Provide specific examples and evidence
4. Consider both direct and indirect influences
5. Maintain chronological accuracy

Your responses should be well-structured, informative, and suitable for academic or professional research.`)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [tempPrompt, setTempPrompt] = useState(systemPrompt)
  const [logEntries, setLogEntries] = useState<AILogEntry[]>(mockAILog)
  const promptEditorRef = useRef<HTMLDivElement>(null)
  const activityLogRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (promptEditorRef.current && !promptEditorRef.current.contains(event.target as Node)) {
        setShowPromptEditor(false)
      }
      if (activityLogRef.current && !activityLogRef.current.contains(event.target as Node)) {
        setShowActivityLog(false)
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleResearch = () => {
    if (chatInput.trim()) {
      setIsDocumentMode(true)
      setChatInput("")
    }
  }

  const toggleLogEntry = (id: string) => {
    setLogEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, expanded: !entry.expanded } : entry)))
  }

  const getLogEntryIcon = (type: AILogEntry["type"]) => {
    switch (type) {
      case "thinking":
        return "🤔"
      case "action":
        return "⚡"
      case "observation":
        return "👁️"
      case "user_input":
        return "💬"
      default:
        return "📝"
    }
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Document Area - 90% */}
      <div className="flex-1 overflow-hidden">
        {isDocumentMode ? (
          <CanvasEditor />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 p-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-2 text-gray-300">Research Panel</div>
              <div className="text-sm">Ask a question below to start researching influences</div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input with Controls - 10% */}
      <div className="border-t border-[#1a1a1a] p-4 space-y-3 bg-[#0a0a0a]">
        {/* Control Buttons */}
        <div className="flex items-center justify-start space-x-2">
          {/* System Prompt Dropdown */}
          <div className="relative" ref={promptEditorRef}>
            <button
              onClick={() => {
                setTempPrompt(systemPrompt)
                setShowPromptEditor(!showPromptEditor)
                setShowActivityLog(false)
                setShowSuggestions(false)
              }}
              className="flex items-center space-x-2 text-xs text-gray-400 hover:text-primary bg-[#121212] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-primary/30 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Change prompt</span>
              {showPromptEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Prompt Editor Dropdown */}
            {showPromptEditor && (
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-lg shadow-xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">System Prompt</h4>
                  </div>
                  <textarea
                    value={tempPrompt}
                    onChange={(e) => setTempPrompt(e.target.value)}
                    className="w-full h-32 p-3 bg-[#121212] border border-[#1a1a1a] rounded-md resize-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 text-gray-100 placeholder-gray-500 text-xs"
                    placeholder="Enter your system prompt..."
                  />
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPromptEditor(false)}
                      className="border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] hover:text-white text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSystemPrompt(tempPrompt)
                        setShowPromptEditor(false)
                      }}
                      className="bg-primary hover:bg-primary/90 text-white border-0 text-xs"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Research Log Dropdown */}
          <div className="relative" ref={activityLogRef}>
            <button
              onClick={() => {
                setShowActivityLog(!showActivityLog)
                setShowPromptEditor(false)
                setShowSuggestions(false)
              }}
              className="flex items-center space-x-2 text-xs text-gray-400 hover:text-primary bg-[#121212] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-primary/30 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              <Activity className="w-3 h-3" />
              <span>Research Log</span>
              {showActivityLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Research Log Dropdown */}
            {showActivityLog && (
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-[#1a1a1a] pb-2">
                    <h4 className="text-sm font-medium text-white">Research Log</h4>
                    <div className="flex space-x-2">
                      <span className="text-xs text-gray-400 bg-[#121212] px-2 py-1 rounded">Latest</span>
                      <span className="text-xs text-gray-500 bg-[#0a0a0a] px-2 py-1 rounded border border-[#1a1a1a]">
                        Viewing
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0 max-h-60 overflow-y-auto">
                    {logEntries.map((entry, index) => (
                      <div key={entry.id}>
                        <button
                          onClick={() => toggleLogEntry(entry.id)}
                          className="w-full flex items-start space-x-3 py-2 hover:bg-[#121212] rounded transition-colors"
                        >
                          {/* Timeline thread */}
                          <div className="flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full bg-[#1a1a1a] border-2 border-primary flex items-center justify-center flex-shrink-0">
                              <span className="text-xs">{getLogEntryIcon(entry.type)}</span>
                            </div>
                            {index < logEntries.length - 1 && <div className="w-0.5 h-6 bg-[#1a1a1a] mt-1"></div>}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-300 truncate">{entry.content}</p>
                              <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                <span className="text-xs text-gray-500">{entry.status}</span>
                                {entry.details && (
                                  <ChevronDown
                                    className={`w-3 h-3 text-gray-500 transition-transform ${
                                      entry.expanded ? "rotate-180" : ""
                                    }`}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        {entry.expanded && entry.details && (
                          <div className="ml-8 pb-2">
                            <p className="text-xs text-gray-500 leading-relaxed">{entry.details}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          <div className="relative" ref={suggestionsRef}>
            <button
              onClick={() => {
                setShowSuggestions(!showSuggestions)
                setShowPromptEditor(false)
                setShowActivityLog(false)
              }}
              className="flex items-center space-x-2 text-xs text-gray-400 hover:text-primary bg-[#121212] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-primary/30 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              <Lightbulb className="w-3 h-3" />
              <span>Suggestions</span>
              {showSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-lg shadow-xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Follow-up Questions</h4>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setChatInput(suggestion)
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left p-2 text-xs text-gray-300 hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors border border-[#1a1a1a] hover:border-primary/30"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="flex space-x-2">
          <Input
            placeholder="Research influences for Shaft (1971)..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleResearch()}
            className="flex-1 bg-[#121212] border-[#1a1a1a] text-gray-100 placeholder-gray-500 focus:border-primary/50 focus:ring-primary/20"
          />
          <Button onClick={handleResearch} size="sm" className="bg-primary hover:bg-primary/90 text-white border-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

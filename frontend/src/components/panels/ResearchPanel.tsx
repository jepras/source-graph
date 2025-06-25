import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, ChevronDown, ChevronUp, Activity, Lightbulb } from 'lucide-react';
import { CanvasTab } from '../canvas/CanvasTab';
import { ChatInput } from '../canvas/ChatInput';
import { ConflictResolution } from '../common/ConflictResolution';
import { useCanvas } from '../../contexts/CanvasContext';
import { useCanvasOperations } from '../../hooks/useCanvas';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { proposalApi } from '../../services/api';
import type { AcceptProposalsRequest, StructuredOutput } from '../../services/api';

interface ResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

interface AILogEntry {
  id: string;
  timestamp: string;
  type: "thinking" | "action" | "observation" | "user_input";
  content: string;
  details?: string;
  status: "Added" | "Generated" | "Edited" | "Completed";
  expanded?: boolean;
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
];

const suggestions = [
  "How did Shaft influence modern action heroes?",
  "What musical elements from Shaft appear in contemporary films?",
  "Compare Shaft's cinematography to modern crime dramas",
  "Analyze the cultural impact of blaxploitation on today's cinema",
  "What visual techniques from French New Wave influenced Shaft?",
];

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ onItemSaved }) => {
  const { state, clearCanvas } = useCanvas();
  const { startResearch, sendChatMessage } = useCanvasOperations();
  const { loadItemWithAccumulation } = useGraphOperations();
  
  const [isDocumentMode, setIsDocumentMode] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Add conflict resolution state
  const [conflictData, setConflictData] = useState<{
    conflicts: any;
    previewData: any;
    newData: StructuredOutput;
  } | null>(null);
  
  const [systemPrompt, setSystemPrompt] = useState(
    `You are an AI research assistant specializing in influence mapping and cultural analysis. When researching influences:

1. Focus on concrete, verifiable connections between works
2. Organize findings into clear categories (Visual Style, Musical Innovation, Character Archetypes, etc.)
3. Provide specific examples and evidence
4. Consider both direct and indirect influences
5. Maintain chronological accuracy

Your responses should be well-structured, informative, and suitable for academic or professional research.`
  );
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(systemPrompt);
  const [logEntries, setLogEntries] = useState<AILogEntry[]>(mockAILog);
  const promptEditorRef = useRef<HTMLDivElement>(null);
  const activityLogRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (promptEditorRef.current && !promptEditorRef.current.contains(event.target as Node)) {
        setShowPromptEditor(false);
      }
      if (activityLogRef.current && !activityLogRef.current.contains(event.target as Node)) {
        setShowActivityLog(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update document mode when canvas state changes
  useEffect(() => {
    setIsDocumentMode(!!state.currentDocument);
  }, [state.currentDocument]);

  const handleChatSubmit = async (message: string) => {
    if (!state.currentDocument) {
      // First message - start research
      await startResearch(message);
    } else {
      // Subsequent messages - chat interaction
      await sendChatMessage(message);
    }
  };

  const toggleLogEntry = (id: string) => {
    setLogEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, expanded: !entry.expanded } : entry))
    );
  };

  const getLogEntryIcon = (type: AILogEntry["type"]) => {
    switch (type) {
      case "thinking":
        return "🤔";
      case "action":
        return "⚡";
      case "observation":
        return "👁️";
      case "user_input":
        return "💬";
      default:
        return "📝";
    }
  };

  const handleSaveToGraph = async () => {
    setSaveError(null); 
    if (!state.currentDocument) return;

    // Get all sections selected for graph
    const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph && s.influence_data);
    
    if (selectedSections.length === 0) {
      alert('Please select at least one influence to save to the graph');
      return;
    }

    setSaveLoading(true);

    try {
      // Convert Canvas sections to AcceptProposalsRequest format
      const request: AcceptProposalsRequest = {
        item_name: state.currentDocument.item_name,
        item_type: state.currentDocument.item_type,
        creator: state.currentDocument.creator,
        item_year: selectedSections[0]?.influence_data?.year, // Use first influence year as item year
        item_description: state.currentDocument.sections.find(s => s.type === 'intro')?.content,
        accepted_proposals: selectedSections.map(section => ({
          ...section.influence_data!,
          accepted: true,
          parent_id: undefined,
          children: [],
          is_expanded: false,
          influence_type: section.influence_data?.influence_type || 'general'
        }))
      };

      const result = await proposalApi.acceptProposals(request);
      
      // Check if conflict resolution is needed
      if (result && !result.success && result.requires_review) {
        setConflictData({
          conflicts: result.conflicts,
          previewData: result.preview_data,
          newData: result.new_data as StructuredOutput
        });
      } else if (result?.success && result.item_id) {
        // Success - load item into graph
        await loadItemWithAccumulation(result.item_id, state.currentDocument.item_name);
        onItemSaved(result.item_id);
      }
    } catch (err: any) {
      console.error('Failed to save to graph:', err);
      
      // Parse validation errors from API response
      let errorMessage = 'Failed to save to graph. Please try again.';
      
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        if (typeof detail === 'string' && detail.includes('validation error')) {
          // Parse Pydantic validation error
          if (detail.includes('scope')) {
            errorMessage = 'Error with influence. Issue with scope - must be macro, micro, or nano.';
          } else if (detail.includes('year')) {
            errorMessage = 'Error with influence. Issue with year - must be a valid number.';
          } else if (detail.includes('confidence')) {
            errorMessage = 'Error with influence. Issue with confidence - must be between 0 and 1.';
          } else {
            errorMessage = 'Error with influence data. Please refine sections and try again.';
          }
        }
      } else if (err?.message) {
        // Handle other error formats
        if (err.message.includes('scope')) {
          errorMessage = 'Error with influence. Issue with scope - must be macro, micro, or nano.';
        } else if (err.message.includes('validation error')) {
          errorMessage = 'Error with influence data. Please refine sections and try again.';
        }
      }
      
      setSaveError(errorMessage);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string, influenceResolutions?: Record<string, any>) => {
    if (!conflictData) return;
    
    try {
      const { influenceApi } = await import('../../services/api');
      
      // Special case: influence conflicts set to merge but no main item conflicts
      if (resolution === 'merge' && !selectedItemId && conflictData.conflicts.main_item_conflicts.length === 0) {
        // Create a new main item but with the influence resolutions applied
        const result = await influenceApi.forceSaveAsNew(conflictData.newData);
        
        if (result.success && result.item_id) {
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        }
      } else if (resolution === 'create_new') {
        const result = await influenceApi.forceSaveAsNew(conflictData.newData);
        
        if (result.success && result.item_id) {
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        }
      } else if (resolution === 'merge' && selectedItemId) {
        const result = await influenceApi.mergeWithComprehensiveResolutions(
          selectedItemId, 
          conflictData.newData, 
          influenceResolutions || {}
        );
        
        if (result.success && result.item_id) {
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        }
      }
      setConflictData(null);
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    }
  };

  // Show conflict resolution if needed
  if (conflictData) {
    return (
      <div className="h-full flex flex-col bg-design-gray-950">
        <ConflictResolution
          conflicts={conflictData.conflicts}
          previewData={conflictData.previewData}
          newData={conflictData.newData}
          onResolve={handleConflictResolve}
          onCancel={() => setConflictData(null)}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Document Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        {isDocumentMode ? (
          <CanvasTab onItemSaved={onItemSaved} />
        ) : (
          <div className="h-full flex items-center justify-center text-design-gray-400 p-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-2 text-design-gray-300">Research Panel</div>
              <div className="text-sm">Ask a question below to start researching influences</div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input with Controls - Fixed at bottom */}
      <div className="border-t border-design-gray-800 p-4 space-y-3 bg-black flex-shrink-0">
        {/* Control Buttons */}
        <div className="flex items-center justify-start space-x-2">
          {/* System Prompt Dropdown */}
          <div className="relative" ref={promptEditorRef}>
            <button
              onClick={() => {
                setTempPrompt(systemPrompt);
                setShowPromptEditor(!showPromptEditor);
                setShowActivityLog(false);
                setShowSuggestions(false);
              }}
              className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200"
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
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-design-gray-950/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">System Prompt</h4>
                  </div>
                  <textarea
                    value={tempPrompt}
                    onChange={(e) => setTempPrompt(e.target.value)}
                    className="w-full h-32 p-3 bg-design-gray-1200 border border-design-gray-800 rounded-md resize-none focus:ring-1 focus:ring-design-red/50 focus:border-design-red/50 text-design-gray-100 placeholder-design-gray-500 text-xs"
                    placeholder="Enter your system prompt..."
                  />
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPromptEditor(false)}
                      className="border-design-gray-800 text-design-gray-400 hover:bg-black hover:text-white text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSystemPrompt(tempPrompt);
                        setShowPromptEditor(false);
                      }}
                      className="bg-design-red hover:bg-design-red-hover text-white border-0 text-xs"
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
                setShowActivityLog(!showActivityLog);
                setShowPromptEditor(false);
                setShowSuggestions(false);
              }}
              className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              <Activity className="w-3 h-3" />
              <span>Research Log</span>
              {showActivityLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Research Log Dropdown */}
            {showActivityLog && (
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-design-gray-950/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-design-gray-800 pb-2">
                    <h4 className="text-sm font-medium text-white">Research Log</h4>
                    <div className="flex space-x-2">
                      <span className="text-xs text-design-gray-400 bg-design-gray-900 px-2 py-1 rounded">Latest</span>
                      <span className="text-xs text-design-gray-500 bg-design-gray-950 px-2 py-1 rounded border border-design-gray-800">
                        Viewing
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0 max-h-60 overflow-y-auto">
                    {logEntries.map((entry, index) => (
                      <div key={entry.id}>
                        <button
                          onClick={() => toggleLogEntry(entry.id)}
                          className="w-full flex items-start space-x-3 py-2 hover:bg-design-gray-900 rounded transition-colors"
                        >
                          {/* Timeline thread */}
                          <div className="flex flex-col items-center">
                            <div className="w-5 h-5 rounded-full bg-black border-2 border-design-red flex items-center justify-center flex-shrink-0">
                              <span className="text-xs">{getLogEntryIcon(entry.type)}</span>
                            </div>
                            {index < logEntries.length - 1 && <div className="w-0.5 h-6 bg-black mt-1"></div>}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-design-gray-300 truncate">{entry.content}</p>
                              <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                <span className="text-xs text-design-gray-500">{entry.status}</span>
                                {entry.details && (
                                  <ChevronDown
                                    className={`w-3 h-3 text-design-gray-500 transition-transform ${
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
                            <p className="text-xs text-design-gray-500 leading-relaxed">{entry.details}</p>
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
                setShowSuggestions(!showSuggestions);
                setShowPromptEditor(false);
                setShowActivityLog(false);
              }}
              className="flex items-center space-x-2 text-xs text-design-gray-400 hover:text-design-red bg-design-gray-1200 hover:bg-black border border-design-gray-800 hover:border-design-red/30 px-3 py-1.5 rounded-md transition-all duration-200"
            >
              <Lightbulb className="w-3 h-3" />
              <span>Suggestions</span>
              {showSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute bottom-full left-0 mb-2 w-96 bg-design-gray-950/95 backdrop-blur-sm border border-design-gray-800 rounded-lg shadow-xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Follow-up Questions</h4>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          // We'll handle this through the ChatInput component
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left p-2 text-xs text-design-gray-300 hover:text-white hover:bg-black rounded-md transition-colors border border-design-gray-800 hover:border-design-red/30"
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

        {/* Chat Input Component */}
        <ChatInput 
          onSubmit={handleChatSubmit}
          onSave={handleSaveToGraph}
          loading={state.loading || saveLoading}
          placeholder="Enter the item you want to research..."
        />
      </div>

      {/* Error Display */}
      {(state.error || saveError) && (
        <div className="bg-red-900/20 border-l-4 border-red-400 p-4 m-4 border-design-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-300">{state.error || saveError}</p>
            {saveError && (
              <button
                onClick={() => setSaveError(null)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
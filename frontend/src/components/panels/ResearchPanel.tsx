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
import { proposalApi, api } from '../../services/api';
import type { AcceptProposalsRequest, StructuredOutput, InfluenceProposal } from '../../services/api';

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
  const [tempPrompt, setTempPrompt] = useState(systemPrompt);
  const [logEntries, setLogEntries] = useState<AILogEntry[]>(mockAILog);
  const promptEditorRef = useRef<HTMLDivElement | null>(null);
  const activityLogRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (promptEditorRef.current && !promptEditorRef.current.contains(event.target as Node)) {
        setShowPromptEditor(false);
      }
      if (activityLogRef.current && !activityLogRef.current.contains(event.target as Node)) {
        setShowActivityLog(false);
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
    if (!state.currentDocument) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      // Get selected sections
      const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph);
      
      if (selectedSections.length === 0) {
        setSaveError("No influences selected for saving");
        return;
      }

      // Convert sections to structured output
      const structuredOutput: StructuredOutput = {
        main_item: state.currentDocument.item_name,
        main_item_type: state.currentDocument.item_type,
        main_item_creator: state.currentDocument.creator,
        influences: selectedSections.map(section => {
          const influence = section.influence_data;
          return {
            name: influence?.name || section.title || "Unknown",
            type: influence?.type,
            creator_name: influence?.creator_name,
            creator_type: influence?.creator_type,
            year: influence?.year,
            category: influence?.category || "General",
            scope: influence?.scope || "macro",
            influence_type: influence?.influence_type || "direct",
            confidence: influence?.confidence || 0.8,
            explanation: influence?.explanation || section.content,
            source: undefined,
            clusters: influence?.clusters
          };
        }),
        categories: Array.from(new Set(selectedSections.map(s => s.influence_data?.category || "General")))
      };

      // Convert to InfluenceProposal format
      const acceptedProposals: InfluenceProposal[] = selectedSections.map(section => {
        const influence = section.influence_data!;
        return {
          name: influence.name,
          type: influence.type,
          creator_name: influence.creator_name,
          creator_type: influence.creator_type,
          year: influence.year,
          category: influence.category,
          scope: influence.scope,
          influence_type: influence.influence_type || "direct",
          confidence: influence.confidence,
          explanation: influence.explanation,
          accepted: true,
          parent_id: undefined,
          children: [],
          is_expanded: false,
          clusters: influence.clusters
        };
      });

      // Accept proposals
      const response = await proposalApi.acceptProposals({
        item_name: state.currentDocument.item_name,
        item_type: state.currentDocument.item_type,
        creator: state.currentDocument.creator,
        accepted_proposals: acceptedProposals
      });

      if (response.success && response.item_id) {
        // Load the item into the graph
        await loadItemWithAccumulation(response.item_id, state.currentDocument.item_name);
        onItemSaved(response.item_id);
        
        // Clear the canvas after successful save
        clearCanvas();
      } else if (response.requires_review) {
        // Show conflict resolution
        setConflictData({
          conflicts: response.conflicts,
          previewData: response.preview_data,
          newData: structuredOutput
        });
      } else {
        setSaveError(response.message || "Failed to save influences");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save influences");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string, influenceResolutions?: Record<string, any>) => {
    if (!state.currentDocument || !conflictData) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      let response;
      
      if (resolution === 'create_new') {
        // Create new item
        const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph);
        const acceptedProposals: InfluenceProposal[] = selectedSections.map(section => {
          const influence = section.influence_data!;
          return {
            name: influence.name,
            type: influence.type,
            creator_name: influence.creator_name,
            creator_type: influence.creator_type,
            year: influence.year,
            category: influence.category,
            scope: influence.scope,
            influence_type: influence.influence_type || "direct",
            confidence: influence.confidence,
            explanation: influence.explanation,
            accepted: true,
            parent_id: undefined,
            children: [],
            is_expanded: false,
            clusters: influence.clusters
          };
        });

        response = await proposalApi.acceptProposals({
          item_name: state.currentDocument.item_name,
          item_type: state.currentDocument.item_type,
          creator: state.currentDocument.creator,
          accepted_proposals: acceptedProposals
        });
      } else {
        // Merge with existing item
        if (!selectedItemId) {
          setSaveError("No item selected for merging");
          return;
        }
        
        const selectedSections = state.currentDocument.sections.filter(s => s.selectedForGraph);
        const structuredOutput: StructuredOutput = {
          main_item: state.currentDocument.item_name,
          main_item_type: state.currentDocument.item_type,
          main_item_creator: state.currentDocument.creator,
          influences: selectedSections.map(section => {
            const influence = section.influence_data;
            return {
              name: influence?.name || section.title || "Unknown",
              type: influence?.type,
              creator_name: influence?.creator_name,
              creator_type: influence?.creator_type,
              year: influence?.year,
              category: influence?.category || "General",
              scope: influence?.scope || "macro",
              influence_type: influence?.influence_type || "direct",
              confidence: influence?.confidence || 0.8,
              explanation: influence?.explanation || section.content,
              source: undefined,
              clusters: influence?.clusters
            };
          }),
          categories: Array.from(new Set(selectedSections.map(s => s.influence_data?.category || "General")))
        };

        response = await proposalApi.mergeWithComprehensiveResolutions(
          selectedItemId,
          structuredOutput,
          influenceResolutions || {}
        );
      }

      if (response.success && response.item_id) {
        // Load the item into the graph
        await loadItemWithAccumulation(response.item_id, state.currentDocument.item_name);
        onItemSaved(response.item_id);
        
        // Clear the canvas after successful save
        clearCanvas();
        setConflictData(null);
      } else {
        setSaveError(response.message || "Failed to resolve conflicts");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to resolve conflicts");
    } finally {
      setSaveLoading(false);
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
      <div className="border-t border-design-gray-800 p-4 space-y-3 bg-design-gray-1100 flex-shrink-0">
        {/* Chat Input Component with integrated controls */}
        <ChatInput 
          onSubmit={handleChatSubmit}
          onSave={handleSaveToGraph}
          loading={state.loading || saveLoading}
          placeholder="Enter the item you want to research..."
          // Pass control props
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          showPromptEditor={showPromptEditor}
          setShowPromptEditor={setShowPromptEditor}
          tempPrompt={tempPrompt}
          setTempPrompt={setTempPrompt}
          showActivityLog={showActivityLog}
          setShowActivityLog={setShowActivityLog}
          logEntries={logEntries}
          toggleLogEntry={toggleLogEntry}
          getLogEntryIcon={getLogEntryIcon}
          promptEditorRef={promptEditorRef as React.RefObject<HTMLDivElement>}
          activityLogRef={activityLogRef as React.RefObject<HTMLDivElement>}
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
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, ChevronDown, ChevronUp, Activity, Lightbulb, Loader2 } from 'lucide-react';
import { CanvasTab } from '../canvas/CanvasTab';
import { ChatInput } from '../canvas/ChatInput';
import { ConflictResolution } from '../common/ConflictResolution';
import { useCanvas } from '../../contexts/CanvasContext';
import { useCanvasOperations } from '../../hooks/useCanvas';
import { useCanvasSave } from '../../hooks/useCanvasSave';
import { useConflictResolution } from '../../hooks/useConflictResolution';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { influenceApi } from '../../services/api';
import type { StructuredOutput } from '../../services/api';

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

// Mock AI log data
const mockAILog: AILogEntry[] = [
  {
    id: "1",
    timestamp: "14:30",
    type: "thinking",
    content: "Analyzing influence patterns in 1970s cinema",
    details: "Examining visual style, narrative structure, and cultural impact",
    status: "Completed",
    expanded: false,
  },
  {
    id: "2",
    timestamp: "14:31",
    type: "action",
    content: "Identified key influences: Blaxploitation genre, French New Wave",
    details: "Found 3 macro-level influences and 7 micro-level connections",
    status: "Generated",
    expanded: false,
  },
  {
    id: "3",
    timestamp: "14:32",
    type: "observation",
    content: "Noticed strong connection to 1960s social movements",
    details: "Civil rights movement, urban culture, and political activism themes",
    status: "Added",
    expanded: false,
  },
];

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ onItemSaved }) => {
  const { state, clearCanvas } = useCanvas();
  const { startResearch, sendChatMessage } = useCanvasOperations();
  const { loadItemWithAccumulation } = useGraphOperations();
  
  // Use the shared canvas save hook
  const {
    saveLoading,
    saveError,
    setSaveError,
    handleSaveToGraph: saveToGraph
  } = useCanvasSave({ 
    onItemSaved, 
    clearCanvas 
  });
  
  // Use the shared conflict resolution hook
  const {
    conflictData,
    setConflictData,
    handleConflictResolve: resolveConflicts,
  } = useConflictResolution({ loadItemWithAccumulation, onItemSaved });
  
  const [isDocumentMode, setIsDocumentMode] = useState(false);
  
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

  // Handle clicks outside prompt editor and activity log
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        promptEditorRef.current &&
        !promptEditorRef.current.contains(event.target as Node)
      ) {
        setShowPromptEditor(false);
      }
      if (
        activityLogRef.current &&
        !activityLogRef.current.contains(event.target as Node)
      ) {
        setShowActivityLog(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleChatSubmit = async (message: string) => {
    if (!state.currentDocument) {
      // Start new research
      await startResearch(message);
      setIsDocumentMode(true);
    } else {
      // Continue existing research
      await sendChatMessage(message);
    }
  };

  const toggleLogEntry = (id: string) => {
    setLogEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, expanded: !entry.expanded } : entry
      )
    );
  };

  const getLogEntryIcon = (type: AILogEntry["type"]) => {
    switch (type) {
      case "thinking":
        return "🧠";
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

  const handleSave = async () => {
    try {
      const result = await saveToGraph();
      
      if (result.requires_review && result.new_data) {
        // Show conflict resolution
        setConflictData({
          conflicts: result.conflicts,
          previewData: result.preview_data,
          newData: result.new_data
        });
      }
    } catch (err) {
      // Error is already handled in the hook
      console.error('Save failed:', err);
    }
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string, influenceResolutions?: Record<string, any>) => {
    if (!state.currentDocument || !conflictData) return;

    try {
      let response;
      
      if (resolution === 'create_new') {
        // Use the shared save hook for creating new
        const result = await saveToGraph();
        if (result.success) {
          setConflictData(null);
        }
      } else {
        // Merge with existing item
        if (!selectedItemId) {
          setSaveError("No item selected for merging");
          return;
        }
        
        const structuredOutput = conflictData.newData;
        response = await influenceApi.mergeWithComprehensiveResolutions(
          selectedItemId,
          structuredOutput,
          influenceResolutions || {}
        );

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
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to resolve conflicts");
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
          onSave={handleSave}
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
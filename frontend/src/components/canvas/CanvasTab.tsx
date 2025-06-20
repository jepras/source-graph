import React, { useState } from 'react';
import { DocumentRenderer } from './DocumentRenderer';
import { ChatInput } from './ChatInput';
import { ConflictResolution } from '../common/ConflictResolution';
import { useCanvas } from '../../contexts/CanvasContext';
import { useCanvasOperations } from '../../hooks/useCanvas';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { proposalApi } from '../../services/api';
import { Loader2 } from 'lucide-react';
import type { AcceptProposalsRequest, AcceptProposalsResponse, StructuredOutput } from '../../services/api';

interface CanvasTabProps {
  onItemSaved: (itemId: string) => void;
}

export const CanvasTab: React.FC<CanvasTabProps> = ({ onItemSaved }) => {
  const { state, clearCanvas, updateSection} = useCanvas();
  const { startResearch, sendChatMessage } = useCanvasOperations();
  const { loadItemWithAccumulation } = useGraphOperations();
  const [saveError, setSaveError] = useState<string | null>(null); // Add this line
  
  // Add conflict resolution state
  const [conflictData, setConflictData] = useState<{
    conflicts: any;
    previewData: any;
    newData: StructuredOutput;
  } | null>(null);
  
  const [saveLoading, setSaveLoading] = useState(false);

  const handleChatSubmit = async (message: string) => {
    if (!state.currentDocument) {
      // First message - start research
      await startResearch(message);
    } else {
      // Subsequent messages - chat interaction
      await sendChatMessage(message);
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
          is_expanded: false
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
        
        // Clear selected sections
        selectedSections.forEach(section => {
          updateSection(section.id, { selectedForGraph: false }); // ✅ Use the one from top level
        });
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
      
      if (resolution === 'create_new') {
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
      <div className="h-full flex flex-col bg-white p-4">
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
    <div className="h-full flex flex-col bg-white">
      

      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Research influences through conversation
          </p>
          
          {/* New Research Button */}
          {state.currentDocument && (
            <button
              onClick={() => clearCanvas()}
              className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
            >
              🔄 New Research
            </button>
          )}
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Loading Overlay - ONLY for initial research, not follow-up questions */}
        {state.loading && !state.currentDocument && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <div className="text-sm text-gray-600 font-medium">
                {state.use_two_agent && state.loading_stage === 'analyzing' 
                  ? 'Analyzing influences...' 
                  : state.use_two_agent && state.loading_stage === 'structuring'
                  ? 'Structuring data...'
                  : 'Researching influences...'
                }
              </div>
              <div className="text-xs text-gray-500">
                {state.use_two_agent 
                  ? 'This may take 15-20 seconds with enhanced analysis'
                  : 'This may take 10-15 seconds'
                }
              </div>
            </div>
          </div>
        )}

        {state.currentDocument ? (
          <DocumentRenderer 
            document={state.currentDocument}
            onItemSaved={onItemSaved}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium mb-2">Canvas Research</h3>
              <p className="text-sm text-gray-400 mb-4 max-w-sm">
                Start by asking about influences for any creative work, innovation, or cultural artifact
              </p>
              <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 max-w-sm">
                <strong>Try:</strong> "What influenced Shaft (1971)?"<br/>
                or "Research influences for iPhone design"
              </div>
            </div>
          </div>
        )}

       
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-4">
        <ChatInput 
          onSubmit={handleChatSubmit}
          onSave={handleSaveToGraph}
          loading={state.loading || saveLoading}
          placeholder={
            state.currentDocument 
              ? "Ask about specific influences, request refinements, or explore deeper..."
              : "What would you like to research? (e.g., 'What influenced Shaft (1971)?')"
          }
        />
      </div>

      {/* Error Display */}
      {(state.error || saveError) && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{state.error || saveError}</p>
            {saveError && (
              <button
                onClick={() => setSaveError(null)}
                className="text-red-400 hover:text-red-600 text-sm"
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
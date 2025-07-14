import React, { useState } from 'react';
import { DocumentRenderer } from './DocumentRenderer';
import { ConflictResolution } from '../common/ConflictResolution';
import { useCanvas } from '../../contexts/CanvasContext';
import { useConflictResolution } from '../../hooks/useConflictResolution';
import { useCanvasSave } from '../../hooks/useCanvasSave';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { Loader2 } from 'lucide-react';

interface CanvasTabProps {
  onItemSaved: (itemId: string) => void;
}

export const CanvasTab: React.FC<CanvasTabProps> = ({ onItemSaved }) => {
  const { state, clearCanvas, updateSection } = useCanvas();
  const { loadItemWithAccumulation } = useGraphOperations();
  
  // Use the shared canvas save hook
  const {
    saveLoading,
    saveError,
    setSaveError,
    handleSaveToGraph
  } = useCanvasSave({ 
    onItemSaved, 
    clearCanvas, 
    updateSection 
  });
  
  // Use the shared conflict resolution hook
  const {
    conflictData,
    setConflictData,
    handleConflictResolve,
  } = useConflictResolution({ loadItemWithAccumulation, onItemSaved });

  const handleSave = async () => {
    try {
      const result = await handleSaveToGraph();
      
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

  // Show conflict resolution if needed
  if (conflictData) {
    return (
      <div className="h-full flex flex-col bg-design-gray-950 p-4">
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
      {/* Header */}
      <div className="p-4 border-b border-design-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-design-gray-400">
            Research influences through conversation
          </p>
          
          {/* New Research Button */}
          {state.currentDocument && (
            <button
              onClick={() => clearCanvas()}
              className="px-3 py-1 text-xs border border-design-gray-800 text-design-gray-400 rounded hover:bg-design-gray-900 transition-colors"
            >
              New Research
            </button>
          )}
        </div>
      </div>

      {/* Document Area - Scrollable */}
      <div className="flex-1 overflow-hidden relative">
        {/* Loading Overlay - Fallback for non-streaming research */}
        {state.loading && !state.currentDocument && !state.streamingActive && (
          <div className="absolute inset-0 bg-design-gray-950 bg-opacity-80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-design-red" />
              <div className="text-sm text-design-gray-300 font-medium">
                {state.use_two_agent && state.loading_stage === 'analyzing' 
                  ? 'Analyzing influences...' 
                  : state.use_two_agent && state.loading_stage === 'structuring'
                  ? 'Structuring data...'
                  : 'Researching influences...'
                }
              </div>
              <div className="text-xs text-design-gray-400">
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
            onSave={handleSave}
            saveLoading={saveLoading}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-design-gray-400">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2 text-design-gray-300">Canvas Research</h3>
              <p className="text-sm text-design-gray-400 mb-4 max-w-sm">
                Start by asking about influences for any creative work, innovation, or cultural artifact
              </p>
              <div className="text-xs text-design-gray-400 bg-design-gray-900 rounded p-3 max-w-sm border border-design-gray-800">
                <strong>Try:</strong> "What influenced Shaft (1971)?"<br/>
                or "Research influences for iPhone design"
              </div>
            </div>
          </div>
        )}
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
import React, { useEffect, useRef } from 'react';
import { SectionComponent } from './SectionComponent';
import { RefreshCw, Save, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useCanvas } from '../../contexts/CanvasContext';
import type { CanvasDocument } from '../../types/canvas';

interface DocumentRendererProps {
  document: CanvasDocument;
  onItemSaved: (itemId: string) => void;
  onSave?: () => void;
  saveLoading?: boolean;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({ 
  document, 
  onItemSaved,
  onSave,
  saveLoading = false
}) => {
  const { state } = useCanvas();
  const loadingRef = useRef<HTMLDivElement>(null);

  const selectedCount = document.sections.filter(s => s.selectedForGraph).length;

  // Auto-scroll to loading indicator when it appears
  useEffect(() => {
    if (state.loading && loadingRef.current) {
      loadingRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [state.loading]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-black">
      {/* Document Header with Save Button */}
      <div className="flex items-center justify-between p-4 border-b border-design-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-design-gray-100">
            {document.item_name}
          </h1>
          {document.creator && (
            <span className="text-sm text-design-gray-400">
              by {document.creator}
            </span>
          )}
          {document.item_type && (
            <Badge variant="outline" className="bg-black text-design-gray-300 border-design-gray-800 capitalize text-xs font-medium">
              {document.item_type}
            </Badge>
          )}
          {selectedCount > 0 && (
            <Badge className="bg-design-red/20 text-design-red border-design-red/30 text-xs font-medium">
              {selectedCount} selected for graph
            </Badge>
          )}
          {document.item_year && (
            <Badge variant="outline" className="bg-black text-design-gray-300 border-design-gray-800 text-xs font-medium">
              {document.item_year}
            </Badge>
          )}
        </div>
        
        {/* Save Button - RIGHT HERE where the data is! */}
        {selectedCount > 0 && onSave && (
          <Button
            onClick={onSave}
            disabled={saveLoading}
            className="bg-design-red hover:bg-design-red-hover text-white border-0 focus:ring-2 focus:ring-design-red/30"
            title={`Save ${selectedCount} selected influences to graph`}
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="ml-2">Save {selectedCount} influences</span>
          </Button>
        )}
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Document Sections */}
          <div className="space-y-4">
            {document.sections.map((section) => (
              <SectionComponent
                key={section.id}
                section={section}
                isLoading={state.sectionLoadingStates[section.id] || false}
              />
            ))}
          </div>

          {/* Loading Indicator */}
          {state.loading && (
            <div ref={loadingRef} className="mt-6 p-4 bg-design-gray-900 border border-design-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-design-red" />
                <div>
                  <p className="text-sm font-medium text-design-gray-200">
                    {state.use_two_agent && state.loading_stage === 'analyzing' 
                      ? 'Analyzing influences...' 
                      : state.use_two_agent && state.loading_stage === 'structuring'
                      ? 'Structuring data...'
                      : 'Processing your request...'
                    }
                  </p>
                  <p className="text-xs text-design-gray-400">
                    {state.use_two_agent 
                      ? 'Enhanced analysis in progress'
                      : 'This may take a few moments'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
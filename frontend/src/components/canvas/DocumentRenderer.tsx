import React, { useEffect, useRef } from 'react'; // ADD useEffect and useRef
import { SectionComponent } from './SectionComponent';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCanvas } from '../../contexts/CanvasContext';
import type { CanvasDocument } from '../../types/canvas';

interface DocumentRendererProps {
  document: CanvasDocument;
  onItemSaved: (itemId: string) => void;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({ 
  document, 
  onItemSaved 
}) => {
  const { state } = useCanvas();
  const loadingRef = useRef<HTMLDivElement>(null); // ADD this ref

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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Document Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-design-gray-100">
                {document.item_name}
              </h1>
              {/* Use the proper document.item_year */}
              {document.item_year && (
                <span className="text-lg text-design-gray-300 bg-design-gray-900 px-3 py-1 rounded border border-design-gray-800">
                  {document.item_year}
                </span>
              )}
            </div>
            {document.creator && (
              <p className="text-design-gray-400">by {document.creator}</p>
            )}
            {document.item_type && (
              <p className="text-sm text-design-gray-500 capitalize">{document.item_type}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-design-gray-500">
                {document.sections.length} sections
              </span>
              {selectedCount > 0 && (
                <span className="text-sm text-design-green">
                  {selectedCount} selected for graph
                </span>
              )}
            </div>
          </div>

          {/* Document Sections */}
          <div className="space-y-6">
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
            <div ref={loadingRef} className="mt-8 p-4 bg-design-gray-900 border border-design-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-design-green" />
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
import React, { useEffect, useRef } from 'react'; // ADD useEffect and useRef
import { SectionComponent } from './SectionComponent';
import { Loader2 } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto p-6">
      {/* Document Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {document.item_name}
          </h1>
          {/* Use the proper document.item_year */}
          {document.item_year && (
            <span className="text-lg text-gray-600 bg-gray-100 px-3 py-1 rounded">
              {document.item_year}
            </span>
          )}
        </div>
        {document.creator && (
          <p className="text-gray-600">by {document.creator}</p>
        )}
        {document.item_type && (
          <p className="text-sm text-gray-500 capitalize">{document.item_type}</p>
        )}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-gray-500">
            {document.sections.length} sections
          </span>
          {selectedCount > 0 && (
            <span className="text-sm text-blue-600">
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

      {/* Loading indicator for new content - ADD ref here */}
      {state.loading && (
        <div 
          ref={loadingRef}
          className="flex items-center justify-center py-8"
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generating content...</span>
        </div>
      )}
    </div>
  );
};
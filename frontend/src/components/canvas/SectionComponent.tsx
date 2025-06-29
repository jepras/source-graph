import React, { useState, useRef, useEffect } from 'react';
import { Check, RefreshCw, Edit3, Trash2, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useCanvas } from '../../contexts/CanvasContext';
import { useCanvasOperations } from '../../hooks/useCanvas';
import type { DocumentSection } from '../../types/canvas';

interface SectionComponentProps {
  section: DocumentSection;
  isLoading: boolean;
}

export const SectionComponent: React.FC<SectionComponentProps> = ({ 
  section, 
  isLoading 
}) => {
  const { updateSection, deleteSection } = useCanvas();
  const { refineSection } = useCanvasOperations();
  const [isHovered, setIsHovered] = useState(false);
  const [showHoverMenu, setShowHoverMenu] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [editedContent, setEditedContent] = useState(section.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  

  useEffect(() => {
    setEditedContent(section.content);
  }, [section.content]);

  useEffect(() => {
    if (section.isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [section.isEditing]);

  const handleToggleGraph = () => {
    updateSection(section.id, { selectedForGraph: !section.selectedForGraph });
  };

  const handleStartEdit = () => {
    updateSection(section.id, { isEditing: true });
    setShowHoverMenu(false);
  };

  const handleSaveEdit = () => {
    updateSection(section.id, { 
      content: editedContent,
      isEditing: false,
      metadata: { 
        ...section.metadata, 
        lastEdited: new Date(),
        createdAt: section.metadata?.createdAt || new Date(),
        aiGenerated: section.metadata?.aiGenerated || false
      }
    });
  };

  const handleCancelEdit = () => {
    setEditedContent(section.content);
    updateSection(section.id, { isEditing: false });
  };

  // Find the handleRefine function and update it:
  const handleRefine = async () => {
    if (!refinePrompt.trim()) return;
        
    setShowRefineInput(false);
    setShowHoverMenu(false);
    
    try {
      await refineSection(section.id, refinePrompt);
      setRefinePrompt('');
    } catch (error) {
      console.error('Refinement failed:', error); // DEBUG
      // Show error to user
      alert(`Refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = () => {
    deleteSection(section.id);
    setShowHoverMenu(false);
  };

  const getSectionTypeLabel = () => {
    switch (section.type) {
      case 'intro': return 'Introduction';
      case 'influence-category': return 'Category';
      case 'influence-item': return 'Influence';
      default: return 'Section';
    }
  };

  return (
    <div 
      className={`relative group transition-all duration-200 ${
        section.selectedForGraph ? 'border-l-4 border-l-design-red pl-4' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowHoverMenu(false);
      }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-design-gray-950 bg-opacity-90 flex items-center justify-center z-20 rounded">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-design-red" />
            <span className="text-sm text-design-gray-400">Refining...</span>
          </div>
        </div>
      )}

      {/* Section Header (for categories) */}
      {section.type === 'influence-category' && section.title && (
        <div className="mb-3">
          <Badge variant="outline" className="bg-design-gray-900 text-design-gray-300 border-design-gray-800 mb-2">
            {getSectionTypeLabel()}
          </Badge>
          <h3 className="text-sm font-medium text-design-gray-300">
            {section.title}
          </h3>
        </div>
      )}

      {/* Content */}
      <div className="relative">
        {section.isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-3 border border-design-gray-800 rounded-md resize-none focus:ring-2 focus:ring-design-red focus:border-design-red bg-design-gray-900 text-design-gray-100"
              rows={Math.max(3, editedContent.split('\n').length)}
              style={{ minHeight: '80px' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-design-red text-white text-sm rounded hover:bg-design-red-hover"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 bg-black text-design-gray-300 text-sm rounded hover:bg-design-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-none">
            {section.type === 'influence-item' && (
              <div className="space-y-3">
                {section.influence_data && (
                  <div>
                    <p className="text-sm text-design-gray-400 leading-relaxed">
                      <span className="font-semibold text-design-gray-300">{section.influence_data.name}</span>
                      {section.influence_data.creator_name && (
                        <span className="text-design-gray-400"> by {section.influence_data.creator_name}</span>
                      )}
                      : {section.content}
                    </p>
                  </div>
                )}
                
                {/* Metadata tags */}
                {section.influence_data && (
                  <div className="flex flex-wrap gap-2">
                    {section.influence_data.year && (
                      <Badge variant="outline" className="bg-black text-design-gray-300 border-design-gray-800 text-xs font-medium">
                        {section.influence_data.year}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-black text-design-gray-300 border-design-gray-800 text-xs font-medium">
                      {section.influence_data.category}
                    </Badge>
                    <Badge className="bg-design-red/20 text-design-red border-design-red/30 text-xs font-medium">
                      {section.influence_data.scope}
                    </Badge>
                    <Badge className="bg-design-red/20 text-design-red border-design-red/30 text-xs font-medium">
                      {Math.round(section.influence_data.confidence * 100)}% confidence
                    </Badge>
                    {section.influence_data.clusters && section.influence_data.clusters.length > 0 && (
                      section.influence_data.clusters.map((cluster, index) => (
                        <Badge key={index} variant="outline" className="bg-black text-design-gray-300 border-design-gray-800 text-xs font-medium">
                          {cluster}
                        </Badge>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {section.type !== 'influence-item' && (
              <p className="text-sm text-design-gray-400 leading-relaxed">{section.content}</p>
            )}
          </div>
        )}

        {/* Selected for Graph Indicator */}
        {section.selectedForGraph && (
          <div className="absolute -left-2 top-2">
            <Check className="w-4 h-4 text-design-red bg-design-gray-950 rounded-full border border-design-red" />
          </div>
        )}
      </div>

      {/* Hover Menu */}
      {(isHovered || showHoverMenu) && !section.isEditing && (
        <div className="absolute -right-2 top-2">
          <button
            onClick={() => setShowHoverMenu(!showHoverMenu)}
            className="w-8 h-8 bg-black border border-design-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4 text-design-gray-400" />
          </button>

          {/* Hover Menu Dropdown */}
          {showHoverMenu && (
            <div className="absolute right-0 top-10 bg-black border border-design-gray-800 rounded-lg shadow-lg py-1 z-20 min-w-40">
              <button
                onClick={() => {
                  setShowRefineInput(true);
                  setShowHoverMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
              >
                <RefreshCw className="w-3 h-3" />
                Refine section
              </button>
              
              {section.influence_data && (
                <button
                  onClick={handleToggleGraph}
                  className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
                >
                  <Check className={`w-3 h-3 ${section.selectedForGraph ? 'text-design-red' : 'text-design-gray-500'}`} />
                  {section.selectedForGraph ? 'Remove from graph' : 'Add to graph'}
                </button>
              )}
              
              <button
                onClick={handleStartEdit}
                className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
              >
                <Edit3 className="w-3 h-3" />
                Edit text
              </button>
              
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-design-gray-900 text-red-400 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Refine Input */}
      {showRefineInput && (
        <div className="space-y-2 mt-2">
          <textarea
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            className="w-full p-3 border border-design-gray-800 rounded-md resize-none focus:ring-2 focus:ring-design-red focus:border-design-red bg-black text-design-gray-100 text-sm font-medium"
            rows={2}
            placeholder="Enter refinement prompt..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleRefine}
              className="px-3 py-1 bg-design-red text-white text-sm font-medium rounded hover:bg-design-red-hover"
            >
              Refine
            </button>
            <button
              onClick={() => setShowRefineInput(false)}
              className="px-3 py-1 bg-black text-design-gray-300 text-sm font-medium rounded border border-design-gray-800 hover:bg-design-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
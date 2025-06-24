import React, { useState, useRef, useEffect } from 'react';
import { Check, RefreshCw, Edit3, Trash2, Plus } from 'lucide-react';
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

  const getSectionIcon = () => {
    switch (section.type) {
      case 'intro': return '📄';
      case 'influence-category': return '📂';
      case 'influence-item': return '🎯';
      default: return '📝';
    }
  };

  return (
    <div 
      className={`relative group transition-all duration-200 ${
        section.selectedForGraph ? 'bg-design-green/10 border-l-4 border-design-green pl-4' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowHoverMenu(false);
      }}
    >
      {/* Section Content */}
      <div className="relative">
        {/* Loading Overlay */}
        {isLoading && (
        <div className="absolute inset-0 bg-design-gray-950 bg-opacity-90 flex items-center justify-center z-20 rounded">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-design-green" />
            <span className="text-sm text-design-gray-400">Refining...</span>
          </div>
        </div>
      )}

        {/* Section Header (for categories) */}
        {section.type === 'influence-category' && section.title && (
          <h3 className="text-lg font-semibold text-design-gray-100 mb-2 flex items-center gap-2">
            {getSectionIcon()}
            {section.title}
          </h3>
        )}

        {/* Content */}
        <div className="relative">
          {section.isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-3 border border-design-gray-800 rounded-md resize-none focus:ring-2 focus:ring-design-green focus:border-design-green bg-design-gray-900 text-design-gray-100"
                rows={Math.max(3, editedContent.split('\n').length)}
                style={{ minHeight: '80px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-design-green text-white text-sm rounded hover:bg-design-green-hover"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-design-gray-800 text-design-gray-300 text-sm rounded hover:bg-design-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-none">
              {section.type === 'influence-item' && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getSectionIcon()}</span>
                  <div className="flex-1">
                    {section.influence_data && (
                      <div className="mb-3">
                        <p className="text-design-gray-100 leading-relaxed">
                          <span className="font-semibold">{section.influence_data.name}</span>
                          {section.influence_data.creator_name && (
                            <span className="text-design-gray-400"> by {section.influence_data.creator_name}</span>
                          )}
                          : {section.content}
                        </p>
                      </div>
                    )}
                    
                    {/* Metadata tags */}
                    {section.influence_data && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {section.influence_data.year && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-design-gray-900 text-design-gray-300 border border-design-gray-800">
                            {section.influence_data.year}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-design-gray-900 text-design-gray-300 border border-design-gray-800">
                          {section.influence_data.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-design-green/20 text-design-green border border-design-green/30">
                          {section.influence_data.scope}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-design-green/20 text-design-green border border-design-green/30">
                          {Math.round(section.influence_data.confidence * 100)}% confidence
                        </span>
                        {section.influence_data.clusters && section.influence_data.clusters.length > 0 && (
                          section.influence_data.clusters.map((cluster, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-design-gray-900 text-design-gray-300 border border-design-gray-800">
                              {cluster}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              
              
              {section.type !== 'influence-item' && (
                <p className="text-design-gray-100 leading-relaxed">{section.content}</p>
              )}
            </div>
          )}

          {/* Selected for Graph Indicator */}
          {section.selectedForGraph && (
            <div className="absolute -left-2 top-2">
              <Check className="w-4 h-4 text-design-green bg-design-gray-950 rounded-full border border-design-green" />
            </div>
          )}
        </div>

        {/* Hover Menu */}
        {(isHovered || showHoverMenu) && !section.isEditing && (
          <div className="absolute -right-2 top-2">
            <button
              onClick={() => setShowHoverMenu(!showHoverMenu)}
              className="w-8 h-8 bg-design-gray-900 border border-design-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-design-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4 text-design-gray-400" />
            </button>

            {/* Hover Menu Dropdown */}
            {showHoverMenu && (
              <div className="absolute right-0 top-10 bg-design-gray-950 border border-design-gray-800 rounded-lg shadow-lg py-1 z-20 min-w-40">
                <button
                  onClick={() => {
                    setShowRefineInput(true);
                    setShowHoverMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refine section
                </button>
                
                {section.influence_data && (
                  <button
                    onClick={handleToggleGraph}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
                  >
                    <Check className={`w-3 h-3 ${section.selectedForGraph ? 'text-design-green' : 'text-design-gray-500'}`} />
                    Add to graph
                  </button>
                )}
                
                <button
                  onClick={handleStartEdit}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-design-gray-900 flex items-center gap-2 text-design-gray-300"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit text
                </button>
                
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-design-gray-900 text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refine Input */}
      {showRefineInput && (
        <div className="mt-3 p-3 bg-design-gray-900 rounded-lg border border-design-gray-800">
          <input
            type="text"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="How would you like me to refine this section?"
            className="w-full p-2 border border-design-gray-800 rounded text-sm focus:ring-2 focus:ring-design-green focus:border-design-green bg-design-gray-950 text-design-gray-100 placeholder-design-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRefine();
              } else if (e.key === 'Escape') {
                setShowRefineInput(false);
                setRefinePrompt('');
              }
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleRefine}
              disabled={!refinePrompt.trim()}
              className="px-3 py-1 bg-design-green text-white text-xs rounded hover:bg-design-green-hover disabled:opacity-50"
            >
              Refine
            </button>
            <button
              onClick={() => {
                setShowRefineInput(false);
                setRefinePrompt('');
              }}
              className="px-3 py-1 bg-design-gray-800 text-design-gray-300 text-xs rounded hover:bg-design-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
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
      metadata: { ...section.metadata, lastEdited: new Date() }
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
        section.selectedForGraph ? 'bg-blue-50 border-l-4 border-blue-500 pl-4' : ''
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
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20 rounded">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Refining...</span>
          </div>
        </div>
      )}

        {/* Section Header (for categories) */}
        {section.type === 'influence-category' && section.title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
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
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={Math.max(3, editedContent.split('\n').length)}
                style={{ minHeight: '80px' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {section.type === 'influence-item' && (
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getSectionIcon()}</span>
                  <div className="flex-1">
                    {section.influence_data && (
                      <div className="mb-3">
                        <p className="text-gray-800 leading-relaxed">
                          <span className="font-semibold">{section.influence_data.name}</span>
                          {section.influence_data.creator_name && (
                            <span className="text-gray-600"> by {section.influence_data.creator_name}</span>
                          )}
                          : {section.content}
                        </p>
                      </div>
                    )}
                    
                    {/* Metadata tags */}
                    {section.influence_data && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {section.influence_data.year && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {section.influence_data.year}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {section.influence_data.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {section.influence_data.scope}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {Math.round(section.influence_data.confidence * 100)}% confidence
                        </span>
                        {section.influence_data.clusters && section.influence_data.clusters.length > 0 && (
                          section.influence_data.clusters.map((cluster, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
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
                <p className="text-gray-800 leading-relaxed">{section.content}</p>
              )}
            </div>
          )}

          {/* Selected for Graph Indicator */}
          {section.selectedForGraph && (
            <div className="absolute -left-2 top-2">
              <Check className="w-4 h-4 text-blue-600 bg-white rounded-full border border-blue-600" />
            </div>
          )}
        </div>

        {/* Hover Menu */}
        {(isHovered || showHoverMenu) && !section.isEditing && (
          <div className="absolute -right-2 top-2">
            <button
              onClick={() => setShowHoverMenu(!showHoverMenu)}
              className="w-8 h-8 bg-white border border-gray-300 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>

            {/* Hover Menu Dropdown */}
            {showHoverMenu && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-40">
                <button
                  onClick={() => {
                    setShowRefineInput(true);
                    setShowHoverMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refine section
                </button>
                
                {section.influence_data && (
                  <button
                    onClick={handleToggleGraph}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Check className={`w-3 h-3 ${section.selectedForGraph ? 'text-blue-600' : 'text-gray-400'}`} />
                    Add to graph
                  </button>
                )}
                
                <button
                  onClick={handleStartEdit}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit text
                </button>
                
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
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
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <input
            type="text"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            placeholder="How would you like me to refine this section?"
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Refine
            </button>
            <button
              onClick={() => {
                setShowRefineInput(false);
                setRefinePrompt('');
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
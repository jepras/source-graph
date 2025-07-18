import React, { useEffect, useState } from 'react';
import { useEnhancement } from '../../hooks/useEnhancement';
import type { EnhancedContent } from '../../services/api';

interface EnhancementPanelProps {
  itemId: string;
  itemName: string;
}

export const EnhancementPanel: React.FC<EnhancementPanelProps> = ({ itemId, itemName }) => {
  const {
    loading,
    error,
    enhancedContent,
    lastEnhancement,
    enhanceItem,
    loadEnhancedContent,
    deleteEnhancedContent,
    deleteAllEnhancedContent,
    clearError,
  } = useEnhancement();

  const [showContent, setShowContent] = useState(false);
  const [maxContentPieces, setMaxContentPieces] = useState(4);

  // Load existing enhanced content when component mounts
  useEffect(() => {
    if (itemId) {
      loadEnhancedContent(itemId).catch(console.error);
    }
  }, [itemId, loadEnhancedContent]);

  const handleEnhance = async () => {
    try {
      await enhanceItem({
        item_id: itemId,
        max_content_pieces: maxContentPieces,
      });
      setShowContent(true);
    } catch (error) {
      console.error('Enhancement failed:', error);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    try {
      await deleteEnhancedContent(contentId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all enhanced content for this item?')) {
      try {
        await deleteAllEnhancedContent(itemId);
      } catch (error) {
        console.error('Delete all failed:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'youtube':
        return '🎥';
      case 'spotify':
        return '🎵';
      case 'wikipedia':
        return '📚';
      case 'genius':
        return '🎼';
      default:
        return '🔗';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎧';
      case 'text':
        return '📄';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-design-gray-200">Enhanced Content</h3>
        <div className="flex items-center space-x-2">
          {enhancedContent.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded"
              title="Delete all enhanced content"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Enhancement Controls */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <label className="text-xs text-design-gray-400">Max content pieces:</label>
          <select
            value={maxContentPieces}
            onChange={(e) => setMaxContentPieces(Number(e.target.value))}
            className="text-xs border border-design-gray-800 rounded px-2 py-1 bg-design-gray-1200 text-design-gray-100"
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
          </select>
        </div>

        <button
          onClick={handleEnhance}
          disabled={loading}
          className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            loading
              ? 'bg-black text-design-gray-400 cursor-not-allowed'
              : 'bg-design-red text-white hover:bg-design-red-hover'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⏳</span>
              Enhancing...
            </span>
          ) : (
            `Enhance "${itemName}"`
          )}
        </button>
      </div>

      {/* Enhanced Content Display */}
      {enhancedContent.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-design-gray-400">
              Enhan ({enhancedContent.length})
            </h4>
            <button
              onClick={() => setShowContent(!showContent)}
              className="text-xs text-design-red hover:text-design-red-hover"
            >
              {showContent ? 'Hide' : 'Show'}
            </button>
          </div>

          {showContent && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {enhancedContent.map((content) => (
                <div
                  key={content.id}
                  className="p-3 border border-design-gray-800 rounded-md bg-design-gray-1200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span>{getSourceIcon(content.source)}</span>
                        <span>{getContentTypeIcon(content.content_type)}</span>
                        <span className="text-xs font-medium text-design-gray-300">
                          {content.source}
                        </span>
                        <span className="text-xs text-design-gray-500">
                          Score: {content.relevance_score}/10
                        </span>
                      </div>

                      <h5 className="text-sm font-medium text-design-gray-200 mb-1 line-clamp-2">
                        {content.title}
                      </h5>

                      <p className="text-xs text-design-gray-400 mb-2 line-clamp-2">
                        {content.context_explanation}
                      </p>

                      {content.thumbnail && (
                        <img
                          src={content.thumbnail}
                          alt={content.title}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <a
                          href={content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-design-red hover:text-design-red-hover"
                        >
                          View Source →
                        </a>
                        <span className="text-xs text-design-gray-500">
                          {formatDate(content.created_at)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteContent(content.id)}
                      className="ml-2 text-red-400 hover:text-red-300 text-xs"
                      title="Delete this content"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enhancement Summary */}
      {lastEnhancement && (
        <div className="p-3 bg-design-gray-950 border border-design-gray-800 rounded-md">
          <h4 className="text-xs font-medium text-design-gray-200 mb-2">Last Enhancement</h4>
          <p className="text-xs text-design-gray-300">{lastEnhancement.enhancement_summary}</p>
          {lastEnhancement.analysis?.enhancement_strategy && (
            <details className="mt-2">
              <summary className="text-xs text-design-red cursor-pointer hover:text-design-red-hover">
                View Strategy
              </summary>
              <p className="text-xs text-design-gray-300 mt-1 whitespace-pre-wrap">
                {lastEnhancement.analysis.enhancement_strategy}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}; 
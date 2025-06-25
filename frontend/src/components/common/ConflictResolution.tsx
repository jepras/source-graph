import React, { useState } from 'react';
import { api } from '../../services/api';
import { influenceApi } from '../../services/api';
import type { StructuredOutput } from '../../services/api';

interface ConflictResolutionProps {
  conflicts: {
    main_item_conflicts: any[];
    influence_conflicts: Record<string, any>;
    total_conflicts: number;
  };
  previewData: {
    main_item_preview: any;
    influence_previews: Record<string, any>;
    merge_strategy: string;
  };
  newData: StructuredOutput;
  onResolve: (resolution: 'create_new' | 'merge', selectedItemId?: string, influenceResolutions?: Record<string, any>) => void;
  onCancel: () => void;
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflicts, previewData, newData, onResolve, onCancel
}) => {
  const [selectedMainItem, setSelectedMainItem] = useState<string | null>(null);
  const [influenceResolutions, setInfluenceResolutions] = useState<Record<string, any>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleMainItemSelect = async (itemId: string) => {
    setSelectedMainItem(itemId);
    setPreviewLoading(true);
    
    try {
      const preview = await influenceApi.getItemPreview(itemId);
      // Update preview data for main item
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInfluenceResolution = (influenceIndex: string, resolution: 'create_new' | 'merge', selectedItemId?: string) => {
    setInfluenceResolutions(prev => ({
      ...prev,
      [influenceIndex]: { resolution, selectedItemId }
    }));
  };

  // Determine the overall resolution type based on user selections
  const getOverallResolutionType = (): 'create_new' | 'merge' => {
    // If there are main item conflicts and one is selected
    if (conflicts.main_item_conflicts.length > 0 && selectedMainItem) {
      if (selectedMainItem === 'create_new') {
        return 'create_new';
      }
      return 'merge';
    }
    
    // If there are only influence conflicts, check the resolutions
    if (conflicts.main_item_conflicts.length === 0 && Object.keys(conflicts.influence_conflicts).length > 0) {
      const allInfluenceResolutions = Object.values(influenceResolutions);
      
      // If all influences are set to create_new, use create_new
      const allCreateNew = allInfluenceResolutions.length > 0 && 
        allInfluenceResolutions.every(resolution => resolution.resolution === 'create_new');
      
      if (allCreateNew) {
        return 'create_new';
      }
      
      // If any influence is set to merge, we need to use merge strategy
      // but we'll need to handle this differently since there's no main item conflict
      const anyMerge = allInfluenceResolutions.some(resolution => resolution.resolution === 'merge');
      if (anyMerge) {
        return 'merge';
      }
    }
    
    // Default to create_new for safety
    return 'create_new';
  };

  // Check if all conflicts are resolved
  const areAllConflictsResolved = (): boolean => {
    // Check main item conflicts
    if (conflicts.main_item_conflicts.length > 0 && !selectedMainItem) {
      return false;
    }
    
    // Check influence conflicts
    const influenceConflictKeys = Object.keys(conflicts.influence_conflicts);
    if (influenceConflictKeys.length > 0) {
      return influenceConflictKeys.every(key => influenceResolutions[key]);
    }
    
    return true;
  };

  const getConflictSummary = () => {
    const mainConflicts = conflicts.main_item_conflicts.length;
    const influenceConflicts = Object.keys(conflicts.influence_conflicts).length;
    
    if (mainConflicts > 0 && influenceConflicts > 0) {
      return `Found ${mainConflicts} main item conflict(s) and ${influenceConflicts} influence conflict(s)`;
    } else if (mainConflicts > 0) {
      return `Found ${mainConflicts} main item conflict(s)`;
    } else {
      return `Found ${influenceConflicts} influence conflict(s)`;
    }
  };

  return (
    <div className="bg-design-gray-1200 border border-design-gray-800 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
      <div>
        <h4 className="text-sm font-semibold text-design-gray-200 mb-2">
          ⚠️ Conflicts Detected
        </h4>
        <p className="text-sm text-design-gray-400">
          {getConflictSummary()} for "{newData.main_item}". Please review each conflict:
        </p>
      </div>
      
      {/* Main Item Conflicts */}
      {conflicts.main_item_conflicts.length > 0 && (
        <div className="border-t border-design-gray-800 pt-3">
          <h5 className="text-sm font-medium text-design-gray-200 mb-2">
            🎯 Main Item Conflicts
          </h5>
          <div className="space-y-2">
            {conflicts.main_item_conflicts.map((item) => (
              <label key={item.id} className="flex items-start space-x-3 p-2 border border-design-gray-800 rounded hover:bg-black cursor-pointer">
                <input
                  type="radio"
                  name="main-item"
                  value={item.id}
                  onChange={() => setSelectedMainItem(item.id)}
                  checked={selectedMainItem === item.id}
                  className="mt-1 text-design-red"
                />
                <div className="flex-1 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-design-gray-100">{item.name}</div>
                      <div className="text-design-gray-400">
                        {item.auto_detected_type} • {item.year} • {item.verification_status}
                      </div>
                      {item.creators.length > 0 && (
                        <div className="text-design-gray-500">by {item.creators.join(', ')}</div>
                      )}
                    </div>
                    <div className="text-xs text-design-gray-500">
                      {item.similarity_score}% match<br/>
                      {item.existing_influences_count} influences
                    </div>
                  </div>
                </div>
              </label>
            ))}
            {/* Add Create New Main Item Option */}
            <label className="flex items-start space-x-3 p-2 border border-design-gray-800 rounded hover:bg-black cursor-pointer">
              <input
                type="radio"
                name="main-item"
                value="create_new"
                onChange={() => setSelectedMainItem('create_new')}
                checked={selectedMainItem === 'create_new'}
                className="mt-1 text-design-red"
              />
              <div className="flex-1 text-sm">
                <div className="font-medium text-design-red">➕ Create New Item</div>
                <div className="text-design-gray-400">Create a new main item (ignore matches)</div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Influence Conflicts */}
      {Object.keys(conflicts.influence_conflicts).length > 0 && (
        <div className="border-t border-design-gray-800 pt-3">
          <h5 className="text-sm font-medium text-design-gray-200 mb-2">
            🔗 Influence Conflicts
          </h5>
          <div className="space-y-3">
            {Object.entries(conflicts.influence_conflicts).map(([influenceIndex, conflictInfo]) => {
              const influence = conflictInfo.influence;
              const similarItems = conflictInfo.similar_items;
              const currentResolution = influenceResolutions[influenceIndex];
              
              return (
                <div key={influenceIndex} className="bg-design-gray-950 rounded p-3 border border-design-gray-800">
                  <div className="mb-2">
                    <h6 className="text-sm font-medium text-design-gray-200">
                      {influence.name} ({influence.category})
                    </h6>
                  </div>
                  
                  <div className="space-y-2">
                    {similarItems.map((item: any) => (
                      <label key={item.id} className="flex items-start space-x-3 p-2 border border-design-gray-800 rounded hover:bg-design-gray-900 cursor-pointer">
                        <input
                          type="radio"
                          name={`influence-${influenceIndex}`}
                          value={item.id}
                          onChange={() => handleInfluenceResolution(influenceIndex, 'merge', item.id)}
                          checked={currentResolution?.resolution === 'merge' && currentResolution?.selectedItemId === item.id}
                          className="mt-1 text-design-red"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-design-gray-100">{item.name}</div>
                              <div className="text-design-gray-400">
                                {item.auto_detected_type} • {item.year}
                              </div>
                            </div>
                            <div className="text-xs text-design-gray-500">
                              {item.similarity_score}% match
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                    
                    <label className="flex items-start space-x-3 p-2 border border-design-gray-800 rounded hover:bg-design-gray-900 cursor-pointer">
                      <input
                        type="radio"
                        name={`influence-${influenceIndex}`}
                        value="create_new"
                        onChange={() => handleInfluenceResolution(influenceIndex, 'create_new')}
                        checked={currentResolution?.resolution === 'create_new'}
                        className="mt-1 text-design-red"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-medium text-design-red">➕ Create New Item</div>
                        <div className="text-design-gray-400">Create a new influence item</div>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-design-gray-800">
        <button
          onClick={() => onResolve(getOverallResolutionType(), selectedMainItem || undefined, influenceResolutions)}
          disabled={!areAllConflictsResolved()}
          className="px-3 py-2 text-sm bg-design-red text-white rounded hover:bg-design-red-hover disabled:opacity-50"
        >
          {getOverallResolutionType() === 'create_new' ? '➕ Create New Items' : '🔀 Apply Resolutions'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm border border-design-gray-800 text-design-gray-300 rounded hover:bg-black"
        >
          ❌ Cancel
        </button>
      </div>

      {/* Resolution Summary */}
      {(selectedMainItem || Object.keys(influenceResolutions).length > 0) && (
        <div className="mt-3 p-3 bg-design-gray-950 border border-design-gray-800 rounded text-xs">
          <h6 className="font-medium text-design-gray-200 mb-2">📋 Resolution Summary:</h6>
          {selectedMainItem && (
            <div className="text-design-gray-300 mb-1">
              🎯 <strong>Main Item:</strong> {selectedMainItem === 'create_new' ? 'Create new main item' : 'Merge with existing item'}
            </div>
          )}
          {Object.keys(influenceResolutions).length > 0 && (
            <div className="text-design-gray-300">
              <strong>Influences:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                {Object.entries(influenceResolutions).map(([influenceIdx, resolution]) => {
                  const influence = conflicts.influence_conflicts[influenceIdx]?.influence;
                  const influenceName = influence?.name || `Influence ${influenceIdx}`;
                  return (
                    <li key={influenceIdx} className="text-design-gray-400">
                      {resolution.resolution === 'merge' ? '🔗' : '➕'} {influenceName}: {resolution.resolution === 'merge' ? 'Merge with existing' : 'Create new'}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="mt-2 text-design-gray-400">
            💡 <strong>"{getOverallResolutionType() === 'create_new' ? 'Create New Items' : 'Apply Resolutions'}"</strong> will use your selections above
          </div>
        </div>
      )}
    </div>
  );
};
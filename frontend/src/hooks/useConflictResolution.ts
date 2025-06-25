import { useState } from 'react';
import { influenceApi } from '../services/api';
import type { StructuredOutput } from '../services/api';

interface ConflictData {
  conflicts: any;
  previewData: any;
  newData: StructuredOutput;
}

type ResolutionType = 'create_new' | 'merge';

type UseConflictResolutionProps = {
  loadItemWithAccumulation: (itemId: string, itemName: string) => Promise<void>;
  onItemSaved: (itemId: string) => void;
};

export function useConflictResolution({ loadItemWithAccumulation, onItemSaved }: UseConflictResolutionProps) {
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const handleConflictResolve = async (
    resolution: ResolutionType,
    selectedItemId?: string,
    influenceResolutions?: Record<string, any>
  ) => {
    if (!conflictData) return;
    try {
      if (resolution === 'create_new') {
        const result = await influenceApi.forceSaveAsNew(conflictData.newData);
        if (result.success && result.item_id) {
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        } else {
          console.error('Failed to create new item:', result.message);
          throw new Error(result.message || 'Failed to create new item');
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
        } else {
          console.error('Failed to merge with existing item:', result.message);
          throw new Error(result.message || 'Failed to merge with existing item');
        }
      } else {
        console.error('Invalid merge configuration: missing selectedItemId');
        throw new Error('Invalid merge configuration: missing selectedItemId');
      }
      setConflictData(null);
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      // You might want to show an error message to the user here
      // For now, we'll just log the error and keep the conflict data visible
    }
  };

  return {
    conflictData,
    setConflictData,
    handleConflictResolve,
  };
} 
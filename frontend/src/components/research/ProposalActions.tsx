// Add this to your ProposalActions.tsx
import React, { useState } from 'react';
import { useResearch } from '../../contexts/ResearchContext';
import { useProposals } from '../../hooks/useProposals';
import { ConflictResolution } from '../common/ConflictResolution'; // Reuse existing component
import { api } from '../../services/api'; // ADD this import
import type { StructuredOutput } from '../../services/api';
import { useGraphOperations } from '../../hooks/useGraphOperations'; // ADD this import



interface ProposalActionsProps {
  onItemSaved: (itemId: string) => void;
}

export const ProposalActions: React.FC<ProposalActionsProps> = ({ onItemSaved }) => {
  const { state } = useResearch();
  const { acceptSelectedProposals } = useProposals();
  const { loadItemWithAccumulation } = useGraphOperations(); // ADD this
  
  // Add conflict resolution state
  const [conflictData, setConflictData] = useState<{
    similarItems: any[];
    newData: StructuredOutput;
  } | null>(null);

  const handleAcceptSelected = async () => {
    const result = await acceptSelectedProposals();
    
    // Check if conflict resolution is needed
    if (result && !result.success && result.requires_review) {
      setConflictData({
        similarItems: result.similar_items || [],
        newData: result.new_data as StructuredOutput
      });
    } else if (result?.success && result.item_id) {
      // Use accumulative loading instead of onItemSaved
      if (state.proposals) {
        await loadItemWithAccumulation(result.item_id, state.proposals.item_name);
      }
      onItemSaved(result.item_id); // Still call this for any other side effects
    }
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string) => {
    if (!conflictData) return;
    
    try {
      if (resolution === 'create_new') {
        const result = await api.forceSaveAsNew(conflictData.newData);
        if (result.success && result.item_id) {
          // Use accumulative loading
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        }
      } else if (resolution === 'merge' && selectedItemId) {
        const result = await api.mergeWithExisting(selectedItemId, conflictData.newData);
        if (result.success && result.item_id) {
          // Use accumulative loading  
          await loadItemWithAccumulation(result.item_id, conflictData.newData.main_item);
          onItemSaved(result.item_id);
        }
      }
      setConflictData(null);
    } catch (error) {
      console.error('Conflict resolution failed:', error);
    }
  };

  // Show conflict resolution if needed
  if (conflictData) {
    return (
      <div className="pt-3 border-t border-blue-300">
        <ConflictResolution
          similarItems={conflictData.similarItems}
          newData={conflictData.newData}
          onResolve={handleConflictResolve}
          onCancel={() => setConflictData(null)}
        />
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-blue-300">
      <button 
        onClick={handleAcceptSelected}
        disabled={state.saveLoading || state.selectedProposals.size === 0 || state.savedItemId !== null}
        className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.saveLoading ? 'Saving...' : state.savedItemId ? '✅ Saved' : `💾 Accept Selected (${state.selectedProposals.size})`}
      </button>
      
      {state.selectedProposals.size === 0 && !state.savedItemId && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Select proposals above to save them to the graph
        </p>
      )}
    </div>
  );
};
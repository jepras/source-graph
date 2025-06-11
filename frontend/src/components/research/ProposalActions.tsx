import React from 'react';
import { useResearch } from '../../contexts/ResearchContext';
import { useProposals } from '../../hooks/useProposals';

interface ProposalActionsProps {
  onItemSaved: (itemId: string) => void;
}

export const ProposalActions: React.FC<ProposalActionsProps> = ({ onItemSaved }) => {
  const { state } = useResearch();
  const { acceptSelectedProposals } = useProposals();

  const handleAcceptSelected = async () => {
    await acceptSelectedProposals(onItemSaved);
  };

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
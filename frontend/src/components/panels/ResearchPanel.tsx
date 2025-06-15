import React from 'react';
import { ProposalForm } from '../research/ProposalForm';
import { ProposalResults } from '../research/ProposalResults';
import { useResearch } from '../../contexts/ResearchContext';

interface ResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ onItemSaved }) => {
  const { state } = useResearch();

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-md font-semibold text-gray-800">
          🤖 AI Research
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Search and find what influences everything
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ProposalForm />
        
        {state.proposals && state.proposals.success && (
          <ProposalResults onItemSaved={onItemSaved} />
        )}
        
        {/* Empty State */}
        {!state.proposals && !state.proposalLoading && !state.error && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-3">🎯</div>
            <p className="text-sm font-medium">Generate Influence Proposals</p>
            <p className="text-xs mt-1 text-gray-400">
              Enter an item name to discover organized influences
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
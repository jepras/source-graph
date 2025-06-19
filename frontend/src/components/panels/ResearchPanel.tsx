import React, { useState } from 'react';
import { ProposalForm } from '../research/ProposalForm';
import { ProposalResults } from '../research/ProposalResults';
import { CanvasTab } from '../canvas/CanvasTab';
import { useResearch } from '../../contexts/ResearchContext';

interface ResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({ onItemSaved }) => {
  const { state } = useResearch();
  const [activeTab, setActiveTab] = useState<'proposals' | 'canvas'>('proposals');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'proposals'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🤖 AI Proposals
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'canvas'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📝 Canvas Research
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'proposals' ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs text-gray-500">
                Generate organized influence proposals
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
        ) : (
          <CanvasTab onItemSaved={onItemSaved} />
        )}
      </div>
    </div>
  );
};
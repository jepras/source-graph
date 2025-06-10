import React, { useState } from 'react';
import { ProposalResponse, InfluenceProposal, proposalApi, AcceptProposalsRequest } from '../services/api';

interface ProposalPanelProps {
  proposals: ProposalResponse;
  onProposalsAccepted: (itemId: string) => void;
  onRequestMore: (scope: string, category: string, existingInfluences: string[]) => void;
}

interface ProposalCardProps {
  proposal: InfluenceProposal;
  onToggle: (proposal: InfluenceProposal) => void;
  isSelected: boolean;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onToggle, isSelected }) => {
  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'macro': return 'bg-blue-100 text-blue-800';
      case 'micro': return 'bg-green-100 text-green-800';
      case 'nano': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    }`} onClick={() => onToggle(proposal)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{proposal.name}</h4>
          {proposal.creator_name && (
            <p className="text-sm text-gray-600">by {proposal.creator_name}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeColor(proposal.scope)}`}>
            {proposal.scope.toUpperCase()}
          </span>
          <span className={`text-sm font-medium ${getConfidenceColor(proposal.confidence)}`}>
            {Math.round(proposal.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="font-medium">{proposal.category}</span>
          {proposal.year && <span>({proposal.year})</span>}
        </div>
        
        <p className="text-sm text-gray-700">{proposal.explanation}</p>
        
        <p className="text-xs text-gray-500 italic">
          Influence type: {proposal.influence_type}
        </p>
      </div>

      {/* Selection indicator */}
      <div className="mt-3 flex items-center">
        <div className={`w-4 h-4 rounded border-2 mr-2 flex items-center justify-center ${
          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
        }`}>
          {isSelected && <span className="text-white text-xs">✓</span>}
        </div>
        <span className="text-xs text-gray-600">
          {isSelected ? 'Selected' : 'Click to select'}
        </span>
      </div>
    </div>
  );
};

const ProposalPanel: React.FC<ProposalPanelProps> = ({ 
  proposals, 
  onProposalsAccepted, 
  onRequestMore 
}) => {
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptedItemId, setAcceptedItemId] = useState<string | null>(null);

  const toggleProposal = (proposal: InfluenceProposal) => {
    const newSelected = new Set(selectedProposals);
    const key = `${proposal.name}-${proposal.scope}`;
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedProposals(newSelected);
  };

  const isProposalSelected = (proposal: InfluenceProposal) => {
    return selectedProposals.has(`${proposal.name}-${proposal.scope}`);
  };

  const getSelectedProposalObjects = (): InfluenceProposal[] => {
    const allProposals = [
      ...proposals.macro_influences,
      ...proposals.micro_influences,
      ...proposals.nano_influences
    ];
    
    return allProposals.filter(proposal => isProposalSelected(proposal));
  };

  const handleAcceptSelected = async () => {
    const selectedObjects = getSelectedProposalObjects();
    
    if (selectedObjects.length === 0) {
      alert('Please select at least one proposal to accept.');
      return;
    }

    setIsAccepting(true);
    
    try {
      const request: AcceptProposalsRequest = {
        item_name: proposals.item_name,
        item_type: proposals.item_type,
        artist: proposals.artist,
        item_year: new Date().getFullYear(), // You might want to make this configurable
        accepted_proposals: selectedObjects.map(p => ({ ...p, accepted: true }))
      };

      const result = await proposalApi.acceptProposals(request);
      
      if (result.success) {
        setAcceptedItemId(result.item_id);
        onProposalsAccepted(result.item_id);
        alert(`Successfully saved ${result.accepted_count} influences!`);
      }
    } catch (error) {
      console.error('Error accepting proposals:', error);
      alert('Failed to save proposals. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRequestMore = (scope: string, category: string) => {
    const existingInCategory = [
      ...proposals.macro_influences,
      ...proposals.micro_influences,
      ...proposals.nano_influences
    ]
      .filter(p => p.category === category && p.scope === scope)
      .map(p => p.name);
    
    onRequestMore(scope, category, existingInCategory);
  };

  const scopeSections = [
    { 
      title: 'Macro Influences', 
      subtitle: 'Major foundational influences',
      proposals: proposals.macro_influences, 
      scope: 'macro' 
    },
    { 
      title: 'Micro Influences', 
      subtitle: 'Specific techniques and elements',
      proposals: proposals.micro_influences, 
      scope: 'micro' 
    },
    { 
      title: 'Nano Influences', 
      subtitle: 'Tiny details and specifics',
      proposals: proposals.nano_influences, 
      scope: 'nano' 
    }
  ];

  if (!proposals.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Proposals</h3>
        <p className="text-red-700">{proposals.error_message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Influence Proposals</h2>
        <p className="text-gray-600 mt-1">
          for <strong>{proposals.item_name}</strong>
          {proposals.artist && <span> by {proposals.artist}</span>}
        </p>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
          <span>{proposals.total_proposals} proposals generated</span>
          <span>•</span>
          <span>{selectedProposals.size} selected</span>
          <span>•</span>
          <span>{proposals.all_categories.length} categories</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600">
          Select influences you want to add to the knowledge graph
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleAcceptSelected}
            disabled={selectedProposals.size === 0 || isAccepting}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedProposals.size > 0 && !isAccepting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAccepting ? 'Saving...' : `Accept Selected (${selectedProposals.size})`}
          </button>
        </div>
      </div>

      {/* Scope Sections */}
      {scopeSections.map(section => (
        <div key={section.scope} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
              <p className="text-sm text-gray-600">{section.subtitle}</p>
            </div>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
              {section.proposals.length} proposals
            </span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.proposals.map((proposal, index) => (
              <ProposalCard
                key={`${proposal.name}-${index}`}
                proposal={proposal}
                onToggle={toggleProposal}
                isSelected={isProposalSelected(proposal)}
              />
            ))}
          </div>

          {/* Request More Button */}
          {section.proposals.length > 0 && (
            <div className="text-center">
              <button
                onClick={() => {
                  // Find most common category in this scope for the "more" request
                  const categories = section.proposals.map(p => p.category);
                  const mostCommon = categories.reduce((a, b, i, arr) => 
                    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                  );
                  handleRequestMore(section.scope, mostCommon);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Request more {section.scope} influences ↗
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Success Message */}
      {acceptedItemId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-green-800 font-semibold">Proposals Accepted!</h4>
          <p className="text-green-700 text-sm mt-1">
            Your influences have been saved. You can now view them in the graph or continue adding more.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProposalPanel;
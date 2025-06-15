import React from 'react';
import { useResearch } from '../../contexts/ResearchContext';
import { useProposals } from '../../hooks/useProposals';
import { ProposalQuestions } from './ProposalQuestions';
import { ProposalActions } from './ProposalActions';


interface ProposalResultsProps {
  onItemSaved: (itemId: string) => void;
}

export const ProposalResults: React.FC<ProposalResultsProps> = ({ onItemSaved }) => {
  const { state, toggleProposal, isProposalSelected, dispatch } = useResearch();
  const { getSpecifics, askInfluenceQuestion } = useProposals();


  if (!state.proposals || !state.proposals.success) {
    return null;
  }

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'macro': return 'bg-blue-100 text-blue-800';
      case 'micro': return 'bg-green-100 text-green-800';
      case 'nano': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGetSpecifics = async (proposal: any, scope: string) => {
    await getSpecifics(proposal);
  };

  const handleInfluenceQuestion = async (proposal: any) => {
    await askInfluenceQuestion(proposal);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-blue-800 mb-1">
          🎯 Influence Proposals for "{state.proposals.item_name}"
        </h4>
        
        {/* Item details */}
        <div className="text-xs text-blue-700 space-y-1">
          {state.proposals.item_year && (
            <div><strong>Year:</strong> {state.proposals.item_year}</div>
          )}
          {state.proposals.item_description && (
            <div><strong>Description:</strong> {state.proposals.item_description}</div>
          )}
          {state.proposals.creator && (
            <div><strong>creator:</strong> {state.proposals.creator}</div>
          )}
          {state.proposals.item_type && (
            <div><strong>Type:</strong> {state.proposals.item_type}</div>
          )}
        </div>
      </div>
      
      <div className="text-xs space-y-1 mb-3 pt-2 border-t border-blue-200">
        <div><strong>Total Proposals:</strong> {state.proposals.total_proposals}</div>
        <div><strong>Selected:</strong> {state.selectedProposals.size}</div>
        <div><strong>Categories:</strong> {state.proposals.all_categories.join(', ')}</div>
        {state.proposals.all_clusters && state.proposals.all_clusters.length > 0 && (
          <div><strong>Clusters:</strong> {state.proposals.all_clusters.join(', ')}</div>
        )}
      </div>

      {/* Questions Component */}
      <ProposalQuestions />

      {/* Proposal Lists */}
      {[
        { title: 'Macro (Foundational)', proposals: state.proposals.macro_influences, scope: 'macro' },
        { title: 'Micro (Specific)', proposals: state.proposals.micro_influences, scope: 'micro' },
        { title: 'Nano (Details)', proposals: state.proposals.nano_influences, scope: 'nano' }
      ].map(section => (
        section.proposals.length > 0 && (
          <div key={section.scope} className="mb-3">
            <h5 className="text-xs font-medium text-gray-700 mb-2">{section.title}</h5>
            <div className="space-y-2">
              {section.proposals.map((proposal, index) => {
                const proposalKey = `${proposal.name}-${proposal.scope}`;
                const isLoadingSpecifics = state.loadingSpecifics[proposalKey] || false;
                const hasSpecifics = state.expandedProposals[proposalKey];
                
                return (
                  <div key={`${proposal.name}-${index}`} className="space-y-2">
                    {/* Main proposal card */}
                    <div 
                      className={`p-2 border rounded text-xs transition-colors ${
                        isProposalSelected(proposal.name, proposal.scope)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Header row - clickable for selection */}
                      <div 
                        onClick={() => toggleProposal(`${proposal.name}-${proposal.scope}`)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-medium text-gray-900">{proposal.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeColor(proposal.scope)}`}>
                                {proposal.scope.toUpperCase()}
                              </span>
                              {proposal.clusters && proposal.clusters.length > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  {proposal.clusters[0]}
                                  {proposal.clusters.length > 1 && ` (+${proposal.clusters.length - 1})`}
                                </span>
                              )}
                            </div>
                            <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
                              isProposalSelected(proposal.name, proposal.scope)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isProposalSelected(proposal.name, proposal.scope) && (
                                <span className="text-white text-xs">✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-600 mb-1">{proposal.category}</div>
                        <div className="text-gray-700 mb-2">{proposal.explanation}</div>
                        <div className="text-gray-500">
                          {proposal.year} • {Math.round(proposal.confidence * 100)}% confidence
                        </div>
                      </div>
                      
                      {/* Action buttons row */}
                      <div className="flex flex-col space-y-2 mt-2 pt-2 border-t border-gray-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleGetSpecifics(proposal, proposal.scope)}
                            disabled={isLoadingSpecifics || hasSpecifics}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {isLoadingSpecifics ? 'Loading...' : hasSpecifics ? 'Expanded' : 'Specifics'}
                          </button>
                        </div>
                        
                        {/* Individual influence question input */}
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={state.influenceQuestions[proposalKey] || ''}
                            onChange={(e) => dispatch({ type: 'SET_INFLUENCE_QUESTION', payload: { key: proposalKey, value: e.target.value } })}
                            placeholder={`Ask about "${proposal.name}"...`}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleInfluenceQuestion(proposal);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleInfluenceQuestion(proposal)}
                            disabled={state.influenceQuestionLoading[proposalKey] || !state.influenceQuestions[proposalKey]?.trim()}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {state.influenceQuestionLoading[proposalKey] ? '...' : 'Ask'}
                          </button>
                        </div>

                        {/* Individual influence question response */}
                        {state.influenceQuestionResponses[proposalKey] && state.influenceQuestionResponses[proposalKey].success && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <h6 className="text-xs font-semibold text-yellow-800 mb-1">
                              ✨ More Details Found
                            </h6>
                            <p className="text-xs text-yellow-600 mb-2">
                              {state.influenceQuestionResponses[proposalKey].answer_explanation}
                            </p>
                            
                            <div className="space-y-1">
                              {state.influenceQuestionResponses[proposalKey].new_influences.map((influence, index) => (
                                <div 
                                  key={index}
                                  onClick={() => toggleProposal(`${influence.name}-${influence.scope}`)}
                                  className={`p-2 border rounded cursor-pointer text-xs transition-colors ${
                                    isProposalSelected(influence.name, influence.scope)
                                      ? 'border-yellow-500 bg-yellow-100'
                                      : 'border-yellow-200 bg-white hover:border-yellow-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{influence.name}</div>
                                      <div className="text-gray-600">{influence.category}</div>
                                      <div className="text-gray-700 mt-1">{influence.explanation}</div>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <div className="flex items-center space-x-1">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeColor(influence.scope)}`}>
                                            {influence.scope.toUpperCase()}
                                          </span>
                                          {influence.clusters && influence.clusters.length > 0 && (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                              {influence.clusters[0]}
                                              {influence.clusters.length > 1 && ` (+${influence.clusters.length - 1})`}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-gray-500 mt-1">
                                        {influence.year} • {Math.round(influence.confidence * 100)}% confidence
                                      </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0 ml-2 ${
                                      isProposalSelected(influence.name, influence.scope)
                                        ? 'bg-yellow-500 border-yellow-500'
                                        : 'border-yellow-300'
                                    }`}>
                                      {isProposalSelected(influence.name, influence.scope) && (
                                        <span className="text-white text-xs">✓</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => dispatch({ type: 'REMOVE_INFLUENCE_QUESTION_RESPONSE', payload: proposalKey })}
                              className="mt-2 text-xs text-yellow-600 hover:text-yellow-800 underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested specifics */}
                    {hasSpecifics && hasSpecifics.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {hasSpecifics.map((specific: any, specIndex: number) => (
                          <div
                            key={specIndex}
                            onClick={() => toggleProposal(`${specific.name}-${specific.scope}`)}
                            className={`p-2 border rounded cursor-pointer text-xs transition-colors bg-indigo-25 ${
                              isProposalSelected(specific.name, specific.scope)
                                ? 'border-indigo-400 bg-indigo-100'
                                : 'border-indigo-200 hover:border-indigo-300 bg-indigo-50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-medium text-indigo-900">{specific.name}</span>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    NANO
                                  </span>
                                  {specific.clusters && specific.clusters.length > 0 && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {specific.clusters[0]}
                                      {specific.clusters.length > 1 && ` (+${specific.clusters.length - 1})`}
                                    </span>
                                  )}
                                </div>
                                <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
                                  isProposalSelected(specific.name, specific.scope)
                                    ? 'bg-indigo-500 border-indigo-500'
                                    : 'border-indigo-300'
                                }`}>
                                  {isProposalSelected(specific.name, specific.scope) && (
                                    <span className="text-white text-xs">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-indigo-600 mb-1">{specific.category}</div>
                            <div className="text-indigo-800">{specific.explanation}</div>
                            <div className="text-indigo-500 mt-1">
                              {specific.year} • {Math.round(specific.confidence * 100)}% confidence
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}

      {/* Actions Component */}
      <ProposalActions onItemSaved={onItemSaved} />
    </div>
  );
};
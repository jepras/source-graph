import React from 'react';
import { useResearch } from '../../contexts/ResearchContext';
import { useProposals } from '../../hooks/useProposals';

export const ProposalQuestions: React.FC = () => {
  const { state, dispatch, toggleProposal, isProposalSelected } = useResearch();
  const { askMainItemQuestion } = useProposals();

  if (!state.proposals) return null;

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'macro': return 'bg-blue-100 text-blue-800';
      case 'micro': return 'bg-green-100 text-green-800';
      case 'nano': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMainItemQuestion = async () => {
    await askMainItemQuestion();
  };

  return (
    <div className="space-y-3">
      {/* Main Item Question */}
      <div className="pt-2 border-t border-blue-200">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Ask about "{state.proposals.item_name}":
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={state.mainItemQuestionText}
            onChange={(e) => dispatch({ type: 'SET_MAIN_ITEM_QUESTION_TEXT', payload: e.target.value })}
            placeholder="Can you be more specific about how this influenced it?"
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleMainItemQuestion();
              }
            }}
          />
          <button
            onClick={handleMainItemQuestion}
            disabled={state.mainItemQuestionLoading || !state.mainItemQuestionText.trim()}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {state.mainItemQuestionLoading ? '...' : 'Ask'}
          </button>
        </div>
      </div>

      {/* Main Item Question Response */}
      {state.mainItemQuestionResponse && state.mainItemQuestionResponse.success && (
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <h6 className="text-xs font-semibold text-green-800 mb-1">
            ✨ New Influences Found
          </h6>
          <p className="text-xs text-green-600 mb-2">
            {state.mainItemQuestionResponse.answer_explanation}
          </p>
          
          <div className="space-y-1">
            {state.mainItemQuestionResponse.new_influences.map((influence, index) => (
              <div 
                key={index} 
                onClick={() => toggleProposal(`${influence.name}-${influence.scope}`)}
                className={`p-2 border rounded cursor-pointer text-xs transition-colors ${
                  isProposalSelected(influence.name, influence.scope)
                    ? 'border-green-500 bg-green-100'
                    : 'border-green-200 bg-white hover:border-green-300'
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
                      ? 'bg-green-500 border-green-500'
                      : 'border-green-300'
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
            onClick={() => dispatch({ type: 'SET_MAIN_ITEM_QUESTION_RESPONSE', payload: null })}
            className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
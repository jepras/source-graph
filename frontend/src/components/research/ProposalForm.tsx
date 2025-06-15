import React from 'react';
import { useResearch } from '../../contexts/ResearchContext';
import { useProposals } from '../../hooks/useProposals';

export const ProposalForm: React.FC = () => {
  const { state, setItemName, setCreator, clearResearch, setError } = useResearch();
  const { generateProposals } = useProposals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateProposals();
  };

  const handleClear = () => {
    clearResearch();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
            Item Name*
          </label>
          <input
            id="itemName"
            type="text"
            value={state.itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Stan, Inception, iPhone"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
            Creator
          </label>
          <input
            id="creator"
            type="text"
            value={state.creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="e.g., Eminem, Nolan, Apple"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={state.proposalLoading || !state.itemName.trim()}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.proposalLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              '🎯 Generate Proposals'
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Error Display */}
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Processing Failed</h4>
              <p className="text-sm text-red-600 mt-1">{state.error}</p>
              <div className="mt-2">
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {state.savedItemId && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-green-600">
            <h4 className="text-sm font-medium">✅ Saved!</h4>
            <p className="text-xs mt-1">
              Added to graph: {state.proposals?.item_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { InfluenceGraph } from '../graph/InfluenceGraph';
import { useGraph } from '../../contexts/GraphContext';

export const GraphPanel: React.FC = () => {
  const { 
    state, 
    selectNode, 
    toggleChronologicalOrder, 
    toggleCategoricalLayout, 
    toggleClustering, // NEW: Add clustering toggle
    clearGraph 
  } = useGraph();

  const handleNodeClick = (itemId: string) => {
    selectNode(itemId);
  };

  return (
    <div className="h-full flex flex-col bg-design-gray-950 overflow-hidden">
      {state.loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-design-gray-900 border border-design-gray-800 rounded px-3 py-2 shadow-sm">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-4 w-4 text-design-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-design-gray-300">Loading graph...</span>
          </div>
        </div>
      )}
      
      {state.error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-red-900/50 border border-red-800 rounded px-3 py-2 shadow-sm">
          <div className="text-sm text-red-300">{state.error}</div>
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden">
        {state.accumulatedGraph.nodes.size > 0 ? (
          <InfluenceGraph
            accumulatedGraph={state.accumulatedGraph}
            onNodeClick={handleNodeClick}
            isChronologicalOrder={state.isChronologicalOrder}
            onChronologicalToggle={toggleChronologicalOrder}
            isClusteringEnabled={state.isClusteringEnabled}
            onClusteringToggle={toggleClustering}
            onClearGraph={clearGraph}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-design-gray-950">
            <div className="text-center text-design-gray-400">
              <div className="text-6xl mb-4">🕸️</div>
              <h3 className="text-lg font-medium text-design-gray-200 mb-2">No Graph Data</h3>
              <p className="text-sm">
                Search for an item or generate proposals to build your influence graph
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { InfluenceGraph } from './components/graph/InfluenceGraph';
import { AIResearchPanel } from './components/AIResearchPanel';
import { GraphExpansionControls } from './components/GraphExpansionControls';
import { api, convertExpandedGraphToGraphResponse } from './services/api';
import { extractNodesAndRelationships, mergeExpandedGraphData } from './utils/graphUtils';
import type { Item } from './services/api';
import type { AccumulatedGraph } from './types/graph';

function App() {
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace graphData with accumulated graph
  const [accumulatedGraph, setAccumulatedGraph] = useState<AccumulatedGraph>({
    nodes: new Map(),
    relationships: new Map(),
    selectedNodeId: null,
    expandedNodeIds: new Set()
  });

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const results = await api.searchItems(query);
      setSearchResults(results);
      setError(null);
    } catch (err) {
      setError('Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleItemSelect = async (item: Item) => {
    setGraphLoading(true);
    try {
      const influences = await api.getInfluences(item.id);
      const { nodes, relationships } = extractNodesAndRelationships(influences);
      
      // Start fresh with this item
      setAccumulatedGraph({
        nodes,
        relationships,
        selectedNodeId: item.id,
        expandedNodeIds: new Set([item.id])
      });
      setError(null);
    } catch (err) {
      setError('Failed to load influences');
    } finally {
      setGraphLoading(false);
    }
  };

  const handleNodeClick = async (itemId: string) => {
    console.log('Node clicked:', itemId);
    
    // If this is a completely new starting point (empty graph), load its influences
    if (accumulatedGraph.nodes.size === 0) {
      setGraphLoading(true);
      try {
        const influences = await api.getInfluences(itemId);
        const { nodes, relationships } = extractNodesAndRelationships(influences);
        
        setAccumulatedGraph({
          nodes,
          relationships,
          selectedNodeId: itemId,
          expandedNodeIds: new Set([itemId])
        });
      } catch (err) {
        setError('Failed to load influences');
      } finally {
        setGraphLoading(false);
      }
    } else {
      // Just change selection in existing graph
      setAccumulatedGraph(prev => ({
        ...prev,
        selectedNodeId: itemId
      }));
    }
  };

  const handleExpansion = async (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => {
    console.log(`Expanding ${itemId} in direction: ${direction}`);
    
    setGraphLoading(true);
    try {
      const includeIncoming = direction === 'incoming' || direction === 'both';
      const includeOutgoing = direction === 'outgoing' || direction === 'both';
      
      const expandedGraph = await api.getExpandedGraph(itemId, includeIncoming, includeOutgoing, 2);
      console.log('Expanded graph received:', expandedGraph);
      
      // Merge new data with existing accumulated graph
      setAccumulatedGraph(prev => 
        mergeExpandedGraphData(prev, expandedGraph, itemId)
      );
      
      setError(null);
    } catch (err) {
      console.error('Expansion error:', err);
      setError('Failed to expand graph');
    } finally {
      setGraphLoading(false);
    }
  };

  const handleNewItemSaved = async (itemId: string) => {
    console.log('New item saved:', itemId);
    
    // If no current graph, start with this item
    if (accumulatedGraph.nodes.size === 0) {
      handleNodeClick(itemId);
    } else {
      // Add this item to existing graph by loading its influences
      try {
        setGraphLoading(true);
        const influences = await api.getInfluences(itemId);
        const { nodes, relationships } = extractNodesAndRelationships(influences);
        
        // Merge with existing graph
        setAccumulatedGraph(prev => {
          const newNodes = new Map(prev.nodes);
          const newRelationships = new Map(prev.relationships);
          
          // Add new nodes and relationships
          nodes.forEach((node, id) => newNodes.set(id, node));
          relationships.forEach((rel, id) => newRelationships.set(id, rel));
          
          return {
            nodes: newNodes,
            relationships: newRelationships,
            selectedNodeId: itemId,
            expandedNodeIds: new Set([...prev.expandedNodeIds, itemId])
          };
        });
      } catch (err) {
        console.error('Failed to load new item influences:', err);
        setError('Failed to load new item in graph');
      } finally {
        setGraphLoading(false);
      }
    }
  };

  const handleClearGraph = () => {
    setAccumulatedGraph({
      nodes: new Map(),
      relationships: new Map(),
      selectedNodeId: null,
      expandedNodeIds: new Set()
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🌐 Influence Graph
          </h1>
          <p className="text-gray-600 mt-1">
            Discover how everything influences everything
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="h-[calc(100vh-120px)] flex">
        {/* Left Sidebar - AI Research Panel (20%) */}
        <div className="w-1/5 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🔍 Search & Research
            </h2>
            
            {/* Search Existing Items */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Existing Items
              </label>
              <SearchBar
                onItemSelect={handleItemSelect}
                onSearch={handleSearch}
                searchResults={searchResults}
                loading={searchLoading}
              />
            </div>
          </div>

          {/* AI Research Panel */}
          <div className="flex-1 overflow-y-auto">
            <AIResearchPanel onItemSaved={handleNewItemSaved} />
          </div>
        </div>

        {/* Right Side - Graph Area (80%) */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Error Display */}
          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Graph Container with Expansion Controls */}
          <div className="flex-1 p-4">
            <div className="bg-white rounded-lg shadow h-full flex">
              {/* Main Graph Area */}
              <div className="flex-1 relative">
                {graphLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-gray-500">Loading graph...</div>
                  </div>
                ) : accumulatedGraph.nodes.size > 0 ? (
                  <InfluenceGraph 
                    accumulatedGraph={accumulatedGraph}
                    onNodeClick={handleNodeClick}
                  />
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🌐</div>
                      <h3 className="text-lg font-medium mb-2">Ready to Explore</h3>
                      <p className="text-sm">
                        Search for an existing item or research a new one to start building the influence graph
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Expansion Controls Sidebar */}
              {accumulatedGraph.nodes.size > 0 && (
                <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
                  <GraphExpansionControls
                    selectedItemId={accumulatedGraph.selectedNodeId}
                    onExpand={handleExpansion}
                    loading={graphLoading}
                  />
                  
                  {/* Graph Info */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">
                      Graph Info
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Nodes: {accumulatedGraph.nodes.size}</div>
                      <div>Connections: {accumulatedGraph.relationships.size}</div>
                      <div>Expanded: {accumulatedGraph.expandedNodeIds.size}</div>
                    </div>
                    
                    <button
                      onClick={handleClearGraph}
                      className="mt-3 w-full px-3 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100"
                    >
                      🗑️ Clear Graph
                    </button>
                  </div>

                  {/* Selected Item Info */}
                  {accumulatedGraph.selectedNodeId && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">
                        Selected Item
                      </h4>
                      <div className="text-sm text-gray-600">
                        {accumulatedGraph.nodes.get(accumulatedGraph.selectedNodeId)?.name || 'Unknown'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
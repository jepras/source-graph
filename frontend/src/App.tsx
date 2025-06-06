import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { InfluenceGraph } from './components/graph/InfluenceGraph';
import { AIResearchPanel } from './components/AIResearchPanel';
import { GraphExpansionControls } from './components/GraphExpansionControls';
import { api } from './services/api';
import type { Item, GraphResponse } from './services/api';
import { convertExpandedGraphToGraphResponse } from './services/api';

function App() {
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
      setGraphData(influences);
      setError(null);
    } catch (err) {
      setError('Failed to load influences');
      setGraphData(null);
    } finally {
      setGraphLoading(false);
    }
  };

  // Update handleNodeClick to track selection
  const handleNodeClick = async (itemId: string) => {
    setSelectedItemId(itemId);
    
    // Only reload graph if this item isn't already the center
    if (!graphData || graphData.main_item.id !== itemId) {
      setGraphLoading(true);
      try {
        const influences = await api.getInfluences(itemId);
        setGraphData(influences);
        setExpandedItems(new Set([itemId])); // Track expanded items
        setError(null);
      } catch (err) {
        setError('Failed to load influences');
        setGraphData(null);
      } finally {
        setGraphLoading(false);
      }
    }
  };

  // New handler for when AI research saves new data
  const handleNewItemSaved = async (itemId: string) => {
    console.log('New item saved:', itemId);
    
    // If we currently have graph data, try to expand it with the new item
    if (graphData) {
      try {
        setGraphLoading(true);
        
        // Get the new item's influences
        const newItemData = await api.getInfluences(itemId);
        
        // For now, just replace the graph data with the new item
        // TODO: In the future, we could merge the graphs
        setGraphData(newItemData);
        
      } catch (err) {
        console.error('Failed to load new item influences:', err);
        setError('Failed to load new item in graph');
      } finally {
        setGraphLoading(false);
      }
    } else {
      // If no current graph, just load the new item
      handleNodeClick(itemId);
    }
  };

  

  // Update the expansion handler
  const handleExpansion = async (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => {
    setGraphLoading(true);
    try {
      const includeIncoming = direction === 'incoming' || direction === 'both';
      const includeOutgoing = direction === 'outgoing' || direction === 'both';
      
      console.log(`Expanding ${itemId} in direction: ${direction}`);
      
      // Get expanded graph
      const expandedGraph = await api.getExpandedGraph(itemId, includeIncoming, includeOutgoing, 2);
      console.log('Expanded graph received:', expandedGraph);
      
      // Convert to GraphResponse format
      const convertedGraph = convertExpandedGraphToGraphResponse(expandedGraph);
      console.log('Converted graph:', convertedGraph);
      
      // Update the graph data
      setGraphData(convertedGraph);
      setSelectedItemId(itemId); // Keep the expanded item as selected
      setError(null);
      
    } catch (err) {
      console.error('Expansion error:', err);
      setError('Failed to expand graph');
    } finally {
      setGraphLoading(false);
    }
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

      {/* Main Content - New Layout */}
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
                ) : graphData ? (
                  <InfluenceGraph 
                    data={graphData} 
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
              {graphData && (
                <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
                  <GraphExpansionControls
                    selectedItemId={selectedItemId}
                    onExpand={handleExpansion}
                    loading={graphLoading}
                  />
                  
                  {/* Selected Item Info */}
                  {selectedItemId && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">
                        Selected Item
                      </h4>
                      <div className="text-sm text-gray-600">
                        {graphData.main_item.name}
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
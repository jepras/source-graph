import React, { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { InfluenceGraph } from './components/graph/InfluenceGraph';
import { AIResearch } from './components/AIResearch';
import { api } from './services/api';
import type { Item, GraphResponse } from './services/api';

function App() {
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'research'>('graph'); // Add tab state

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

  const handleNodeClick = async (itemId: string) => {
    setGraphLoading(true);
    try {
      const influences = await api.getInfluences(itemId);
      setGraphData(influences);
      setError(null);
    } catch (err) {
      setError('Failed to load influences');
      setGraphData(null);
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

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('graph')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'graph'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Existing Graph
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'research'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 AI Research
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'graph' && (
          <div className="space-y-8">
            {/* Search Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Search Existing Items</h2>
              <SearchBar
                onItemSelect={handleItemSelect}
                onSearch={handleSearch}
                searchResults={searchResults}
                loading={searchLoading}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Graph Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Influence Graph</h2>
              {graphLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-gray-500">Loading graph...</div>
                </div>
              ) : (
                <InfluenceGraph data={graphData} onNodeClick={handleNodeClick} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'research' && (
          <AIResearch />
        )}
      </main>
    </div>
  );
}

export default App;
import React from 'react';
import { ResizablePanels } from '../common/ResizablePanels';
import { ResizableGraphLayout } from '../common/ResizableGraphLayout';
import { ResearchPanel } from '../panels/ResearchPanel';
import { GraphPanel } from '../panels/GraphPanel';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
import { SearchBar } from '../common/SearchBar';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { useGraph } from '../../contexts/GraphContext';
import type { Item } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { loadItemInfluences, searchAndLoadItem } = useGraphOperations();
  const [searchResults, setSearchResults] = React.useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      const results = await searchAndLoadItem(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleItemSelect = async (item: Item) => {
    await loadItemInfluences(item.id);
    setSearchResults([]); // Clear search results
  };

  const handleItemSaved = async (itemId: string) => {
    await loadItemInfluences(itemId);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              🕸️ Influence Graph
            </h1>
            <div className="text-sm text-gray-500">
              Explore how everything influences everything
            </div>
          </div>
          
          <div className="flex-1 max-w-md mx-8">
            <SearchBar
              onItemSelect={handleItemSelect}
              onSearch={handleSearch}
              searchResults={searchResults}
              loading={searchLoading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">
              v1.0.0
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanels
          leftPanel={
            <ResearchPanel onItemSaved={handleItemSaved} />
          }
          rightPanel={
            <ResizableGraphLayout
              graphPanel={<GraphPanel />}
              expansionPanel={<ItemDetailsPanel />}
              minExpansionWidth={250}
              maxExpansionWidth={500}
              defaultExpansionWidth={320}
            />
          }
          minLeftWidth={280}
          maxLeftWidth={500}
          defaultLeftWidth={350}
          className="h-full"
        />
      </div>
    </div>
  );
};

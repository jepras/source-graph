import React from 'react';
import { ResearchPanel } from '../panels/ResearchPanel';
import { GraphPanel } from '../panels/GraphPanel';
import { ItemDetailsPanel } from '../panels/ItemDetailsPanel';
import { SearchBar } from '../common/SearchBar';
import { Button } from '@/components/ui/button';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { useGraph } from '../../contexts/GraphContext';
import type { Item } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { loadItemInfluences, searchAndLoadItem } = useGraphOperations();
  const [searchResults, setSearchResults] = React.useState<Item[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState("Shaft");
  const [documentContent, setDocumentContent] = React.useState("");

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
    setSelectedItem(item.name);
  };

  const handleItemSaved = async (itemId: string) => {
    await loadItemInfluences(itemId);
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Top Panel */}
      <div className="bg-black border-b border-design-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-design-green rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">IG</span>
              </div>
              <h1 className="text-xl font-semibold text-white">Influence Graph</h1>
              <span className="text-sm text-design-gray-400">Explore how everything influences everything</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="w-80">
                <SearchBar
                  onItemSelect={handleItemSelect}
                  onSearch={handleSearch}
                  searchResults={searchResults}
                  loading={searchLoading}
                />
              </div>
            </div>
            <span className="text-xs text-design-gray-500">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Bottom Split Panel */}
      <div className="flex-1 flex">
        {/* Left Research Panel - 50% */}
        <div className="w-1/2 border-r border-design-gray-800">
          <ResearchPanel onItemSaved={handleItemSaved} />
        </div>

        {/* Right Graph Panel - 50% */}
        <div className="w-1/2">
          <GraphPanel />
        </div>
      </div>
    </div>
  );
};

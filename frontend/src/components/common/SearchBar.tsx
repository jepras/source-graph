import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Item } from '../../services/api';

interface SearchBarProps {
  onItemSelect: (item: Item) => void;
  onSearch: (query: string) => void;
  searchResults: Item[];
  loading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onItemSelect,
  onSearch,
  searchResults,
  loading
}) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      onSearch(value);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const handleItemClick = (item: Item) => {
    onItemSelect(item);
    setQuery(item.name);
    setShowResults(false);
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-design-gray-400 w-4 h-4 z-10" />
      <Input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search for items..."
        className="pl-10 bg-design-gray-1200 border-design-gray-800 text-design-gray-100 placeholder-design-gray-500 focus:border-design-red focus:ring-design-red/20 [&::placeholder]:text-design-gray-500"
      />
      
      {showResults && (
        <div className="absolute z-20 w-full mt-1 bg-[#121212] border border-design-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-design-gray-400">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-3 hover:bg-design-red/10 hover:border-design-red/30 cursor-pointer border-b border-design-gray-800 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-white">{item.name}</div>
                {item.auto_detected_type && (
                  <div className="text-sm text-design-gray-400">{item.auto_detected_type}</div>
                )}
                <div className="text-xs text-design-gray-500">
                  {item.year} • {item.verification_status}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-design-gray-400">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};
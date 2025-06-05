import React, { useState } from 'react';
import type { Item } from '../services/api';

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
    <div className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search for items..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium">{item.name}</div>
                {item.auto_detected_type && (
                  <div className="text-sm text-gray-600">{item.auto_detected_type}</div>
                )}
                <div className="text-xs text-gray-500">
                  {item.year} • {item.verification_status}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { api } from '../services/api';
import type { ResearchRequest, ResearchResponse } from '../services/api';

export const AIResearch: React.FC = () => {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('song');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: ResearchRequest = {
        item_name: itemName.trim(),
        item_type: itemType,
        artist: artist.trim() || undefined
      };

      const response = await api.researchInfluences(request);
      setResult(response);

      if (!response.success) {
        setError(response.error_message || 'Research failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setItemName('');
    setArtist('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🤖 AI Influence Research
      </h2>
      
      {/* Research Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Item Name */}
          <div className="md:col-span-2">
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              id="itemName"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Stan, Inception, iPhone"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Item Type */}
          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="itemType"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="song">Song</option>
              <option value="movie">Movie</option>
              <option value="innovation">Innovation</option>
              <option value="book">Book</option>
              <option value="album">Album</option>
            </select>
          </div>
        </div>

        {/* Artist/Creator */}
        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
            Artist/Creator (optional)
          </label>
          <input
            id="artist"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="e.g., Eminem, Christopher Nolan, Apple"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || !itemName.trim()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Researching...
              </>
            ) : (
              '🔍 Research Influences'
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="text-red-600">
              <h3 className="text-sm font-medium">Research Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && result.success && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🎯 Influences for "{result.item_name}"
            {result.artist && ` by ${result.artist}`}
          </h3>
          
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result.influences_text}
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500 space-x-4">
              <span>Type: {result.item_type}</span>
              <span>•</span>
              <span>Researched by AI</span>
              <span>•</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium mb-2">Ready to Research</h3>
          <p className="text-sm">Enter an item name above and click "Research Influences" to discover what shaped its creation.</p>
        </div>
      )}
    </div>
  );
};
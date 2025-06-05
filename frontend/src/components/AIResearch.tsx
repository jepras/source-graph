import React, { useState } from 'react';
import { api } from '../services/api';
import type { ResearchRequest, ResearchResponse, StructureRequest, StructuredOutput } from '../services/api';

export const AIResearch: React.FC = () => {
  const [itemName, setItemName] = useState('');
  const [creator, setCreator] = useState('');  // Changed from artist
  const [loading, setLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);  // New save loading state
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [structuredResult, setStructuredResult] = useState<StructuredOutput | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);  // New saved state
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
    setStructuredResult(null);
    setSavedItemId(null);

    try {
      const request: ResearchRequest = {
        item_name: itemName.trim(),
        creator: creator.trim() || undefined
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

  const handleStructure = async () => {
    if (!result || !result.success) return;
  
    setStructureLoading(true);
    setError(null);
  
    try {
      const request: StructureRequest = {
        influences_text: result.influences_text,
        main_item: result.item_name,
        main_item_creator: result.artist  // Map from research response
      };
  
      console.log('Structure request being sent:', request);
      console.log('Request JSON:', JSON.stringify(request, null, 2));
  
      const structuredData = await api.structureInfluences(request);
      setStructuredResult(structuredData);
    } catch (err) {
      console.error('Structure error details:', err);
      setError(err instanceof Error ? err.message : 'Failed to structure influences');
    } finally {
      setStructureLoading(false);
    }
  };

  const handleSave = async () => {
    if (!structuredResult) return;

    setSaveLoading(true);
    setError(null);

    try {
      const saveResponse = await api.saveStructuredInfluences(structuredResult);
      setSavedItemId(saveResponse.item_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to database');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClear = () => {
    setItemName('');
    setCreator('');
    setResult(null);
    setStructuredResult(null);
    setSavedItemId(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🤖 AI Influence Research
      </h2>
      
      {/* Research Form - Updated to remove type dropdown */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Name */}
          <div>
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

          {/* Creator (renamed from Artist) */}
          <div>
            <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
              Creator (optional)
            </label>
            <input
              id="creator"
              type="text"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="e.g., Eminem, Christopher Nolan, Apple"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

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
              <h3 className="text-sm font-medium">Error</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {savedItemId && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="text-green-600">
              <h3 className="text-sm font-medium">✅ Saved Successfully!</h3>
              <p className="text-sm mt-1">
                Influences saved to database. Item ID: {savedItemId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Research Results */}
      {result && result.success && (
        <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              🎯 Influences for "{result.item_name}"
              {result.artist && ` by ${result.artist}`}
            </h3>
            
            <button
              onClick={handleStructure}
              disabled={structureLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {structureLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Structuring...
                </>
              ) : (
                '📊 Get Structured Data'
              )}
            </button>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result.influences_text}
            </div>
          </div>
        </div>
      )}

      {/* Structured Results */}
      {structuredResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            📊 Structured Influence Data
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Item Info */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Main Item</h4>
              <div className="text-sm space-y-1">
                <div><strong>Name:</strong> {structuredResult.main_item}</div>
                {structuredResult.main_item_type && (
                  <div><strong>Type:</strong> {structuredResult.main_item_type}</div>
                )}
                {structuredResult.main_item_creator && (
                  <div><strong>Creator:</strong> {structuredResult.main_item_creator}</div>
                )}
                {structuredResult.main_item_creator_type && (
                  <div><strong>Creator Type:</strong> {structuredResult.main_item_creator_type}</div>
                )}
                {structuredResult.main_item_year && (
                  <div><strong>Year:</strong> {structuredResult.main_item_year}</div>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Categories Found</h4>
              <div className="flex flex-wrap gap-2">
                {structuredResult.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Influences List */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-800 mb-3">
              Influences ({structuredResult.influences.length})
            </h4>
            <div className="space-y-3">
              {structuredResult.influences.map((influence, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="font-medium text-gray-800">{influence.name}</h5>
                      {influence.creator_name && (
                        <p className="text-sm text-gray-600">by {influence.creator_name}</p>
                      )}
                      {influence.type && (
                        <p className="text-xs text-gray-500">{influence.type}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-500">{influence.year}</div>
                      <div className="font-medium text-blue-600">
                        {Math.round(influence.confidence * 100)}% confidence
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded mr-2">
                      {influence.category}
                    </span>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {influence.influence_type}
                    </span>
                    {influence.creator_type && (
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded ml-2">
                        {influence.creator_type}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700">{influence.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <button 
              onClick={handleSave}
              disabled={saveLoading || savedItemId !== null}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving to Database...
                </>
              ) : savedItemId ? (
                '✅ Saved to Database'
              ) : (
                '💾 Save to Database'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium mb-2">Ready to Research</h3>
          <p className="text-sm">Enter an item name above and AI will auto-detect the type and research its influences.</p>
        </div>
      )}
    </div>
  );
};
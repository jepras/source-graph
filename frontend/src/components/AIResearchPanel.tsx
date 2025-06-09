import React, { useState } from 'react';
import { api } from '../services/api';
import type { ResearchRequest, ResearchResponse, StructureRequest, StructuredOutput } from '../services/api';
import { ConflictResolution } from './ConflictResolution';


interface AIResearchPanelProps {
  onItemSaved: (itemId: string) => void;
}

export const AIResearchPanel: React.FC<AIResearchPanelProps> = ({ onItemSaved }) => {
  const [itemName, setItemName] = useState('');
  const [creator, setCreator] = useState('');
  const [loading, setLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [structuredResult, setStructuredResult] = useState<StructuredOutput | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStructuredExpanded, setIsStructuredExpanded] = useState(false);
  



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
        main_item_creator: result.artist
      };
  
      const structuredData = await api.structureInfluences(request);
      setStructuredResult(structuredData);
    } catch (err) {
      console.error('Structure error:', err);
      
      // Provide specific error messages based on the error
      let userMessage = 'Failed to structure influences. ';
      
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        
        if (errorMsg.includes('year')) {
          userMessage += 'All influences must have years. Please research items with clear dates.';
        } else if (errorMsg.includes('server error') || errorMsg.includes('500')) {
          userMessage += 'Server processing error. Try researching a different item or simplify the research text.';
        } else if (errorMsg.includes('json') || errorMsg.includes('format')) {
          userMessage += 'Data formatting error. Please try again with a different item.';
        } else {
          userMessage += err.message;
        }
      } else {
        userMessage += 'Please try again or contact support if the problem persists.';
      }
      
      setError(userMessage);
    } finally {
      setStructureLoading(false);
    }
  };

  // Update handleSave
  const handleSave = async () => {
    if (!structuredResult) return;
  
    setSaveLoading(true);
    setError(null);
  
    try {
      const saveResponse = await api.saveStructuredInfluences(structuredResult);
      
      if (saveResponse.requires_review) {
        // Show conflict resolution UI
        setConflictData(saveResponse);
      } else {
        // Normal save success
        setSavedItemId(saveResponse.item_id);
        onItemSaved(saveResponse.item_id);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to database');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConflictResolve = async (resolution: 'create_new' | 'merge', selectedItemId?: string) => {
    setSaveLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (resolution === 'merge' && selectedItemId) {
        response = await api.mergeWithExisting(selectedItemId, structuredResult!);
      } else {
        response = await api.forceSaveAsNew(structuredResult!);
      }
      
      setSavedItemId(response.item_id);
      onItemSaved(response.item_id);
      setConflictData(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
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
    <div className="p-4 space-y-4">
      <h3 className="text-md font-semibold text-gray-800 border-b border-gray-200 pb-2">
        🤖 AI Research
      </h3>
      
      {/* Research Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            id="itemName"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g., Thank You, Inception"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="creator" className="block text-sm font-medium text-gray-700 mb-1">
            Creator (optional)
          </label>
          <input
            id="creator"
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="e.g., Dido, Nolan"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading || !itemName.trim()}
            className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Research
              </>
            ) : (
              '🔍 Research'
            )}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Processing Failed</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <div className="mt-2">
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {savedItemId && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-green-600">
            <h4 className="text-sm font-medium">✅ Saved!</h4>
            <p className="text-xs mt-1">Added to graph: {structuredResult?.main_item}</p>
          </div>
        </div>
      )}

      {result && result.success && (
        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-800">
                🎯 "{result.item_name}"
              </h4>
              
              <button
                onClick={handleStructure}
                disabled={structureLoading}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {structureLoading ? 'Processing...' : 'Structure'}
              </button>
            </div>
            
            <div className="text-xs text-gray-600">
              {isExpanded ? (
                <div className="whitespace-pre-wrap">
                  {result.influences_text}
                </div>
              ) : (
                <div>
                  {result.influences_text.substring(0, 200)}...
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        </div>
      )}

      {/* Structured Results */}
      {structuredResult && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          📊 Structured Data
        </h4>
        
        <div className="text-xs space-y-1 mb-3">
          <div><strong>Item:</strong> {structuredResult.main_item}</div>
          <div><strong>Influences:</strong> {structuredResult.influences.length}</div>
          <div><strong>Categories:</strong> {structuredResult.categories.join(', ')}</div>
        </div>

        {/* Expandable structured data details */}
        <div className="text-xs text-gray-700 mb-3">
          {isStructuredExpanded ? (
            <div className="space-y-2">
              <div>
                <strong>All Influences:</strong>
                <ul className="mt-1 space-y-1 ml-2">
                  {structuredResult.influences.map((influence, index) => (
                    <li key={index} className="text-xs">
                      • <strong>{influence.name}</strong> ({influence.year}) - {influence.influence_type}
                      {influence.explanation && (
                        <div className="text-gray-600 ml-2 mt-1">{influence.explanation}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              {structuredResult.main_item_data && (
                <div>
                  <strong>Main Item Details:</strong>
                  <div className="ml-2 mt-1">
                    <div>Type: {structuredResult.main_item_data.type}</div>
                    <div>Year: {structuredResult.main_item_data.year}</div>
                    {structuredResult.main_item_data.description && (
                      <div>Description: {structuredResult.main_item_data.description}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600">
              Click "Show Details" to see all influences and structured data
            </div>
          )}
        </div>

        <button
          onClick={() => setIsStructuredExpanded(!isStructuredExpanded)}
          className="mb-3 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          {isStructuredExpanded ? 'Hide Details' : 'Show Details'}
        </button>

        {/* Conflict Resolution or Save Button */}
        {conflictData ? (
          <ConflictResolution
            similarItems={conflictData.similar_items}
            newData={conflictData.new_data}
            onResolve={handleConflictResolve}
            onCancel={() => setConflictData(null)}
          />
        ) : (
          <button 
            onClick={handleSave}
            disabled={saveLoading || savedItemId !== null}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveLoading ? 'Checking for conflicts...' : savedItemId ? '✅ Saved' : '💾 Save to Graph'}
          </button>
        )}
      </div>
    )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-xs">Enter an item name to research its influences</p>
        </div>
      )}
    </div>
  );
};
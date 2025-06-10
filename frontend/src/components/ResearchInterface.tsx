import React, { useState } from 'react';
import { ProposalRequest, ProposalResponse, proposalApi } from '../services/api';

interface ResearchInterfaceProps {
  onProposalsGenerated: (proposals: ProposalResponse) => void;
}

const ResearchInterface: React.FC<ResearchInterfaceProps> = ({ onProposalsGenerated }) => {
  const [formData, setFormData] = useState<ProposalRequest>({
    item_name: '',
    item_type: '',
    artist: '',
    context: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemTypes = [
    { value: '', label: 'Auto-detect' },
    { value: 'song', label: 'Song' },
    { value: 'album', label: 'Album' },
    { value: 'movie', label: 'Movie' },
    { value: 'tv_show', label: 'TV Show' },
    { value: 'book', label: 'Book' },
    { value: 'innovation', label: 'Innovation' },
    { value: 'technique', label: 'Technique' },
    { value: 'artwork', label: 'Artwork' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field: keyof ProposalRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_name.trim()) {
      setError('Please enter an item name');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const cleanedRequest: ProposalRequest = {
        item_name: formData.item_name.trim(),
        item_type: formData.item_type || undefined,
        artist: formData.artist?.trim() || undefined,
        context: formData.context?.trim() || undefined
      };

      const proposals = await proposalApi.generateProposals(cleanedRequest);
      
      if (proposals.success) {
        onProposalsGenerated(proposals);
      } else {
        setError(proposals.error_message || 'Failed to generate proposals');
      }
    } catch (err) {
      console.error('Error generating proposals:', err);
      setError('An error occurred while generating proposals. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const exampleItems = [
    { name: 'Stan', artist: 'Eminem', type: 'song' },
    { name: 'Inception', artist: 'Christopher Nolan', type: 'movie' },
    { name: 'To Kill a Mockingbird', artist: 'Harper Lee', type: 'book' },
    { name: 'The iPhone', artist: 'Apple', type: 'innovation' }
  ];

  const fillExample = (example: typeof exampleItems[0]) => {
    setFormData({
      item_name: example.name,
      artist: example.artist,
      item_type: example.type,
      context: ''
    });
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Discover Influences</h1>
        <p className="text-gray-600">
          Use AI to discover the macro, micro, and nano influences that shaped any creative work
        </p>
      </div>

      {/* Quick Examples */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Examples:</h3>
        <div className="flex flex-wrap gap-2">
          {exampleItems.map((example, index) => (
            <button
              key={index}
              onClick={() => fillExample(example)}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100 transition-colors"
            >
              {example.name} {example.artist && `by ${example.artist}`}
            </button>
          ))}
        </div>
      </div>

      {/* Research Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {/* Item Name */}
          <div>
            <label htmlFor="item_name" className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              id="item_name"
              value={formData.item_name}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
              placeholder="e.g., Stan, Inception, iPhone"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Artist/Creator */}
          <div>
            <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
              Creator/Artist
            </label>
            <input
              type="text"
              id="artist"
              value={formData.artist}
              onChange={(e) => handleInputChange('artist', e.target.value)}
              placeholder="e.g., Eminem, Christopher Nolan, Apple"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Item Type */}
          <div>
            <label htmlFor="item_type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="item_type"
              value={formData.item_type}
              onChange={(e) => handleInputChange('item_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {itemTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Context */}
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Context (Optional)
            </label>
            <textarea
              id="context"
              value={formData.context}
              onChange={(e) => handleInputChange('context', e.target.value)}
              placeholder="Any additional information about the item that might help with research..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !formData.item_name.trim()}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isGenerating || !formData.item_name.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Discovering influences...
            </span>
          ) : (
            'Generate Influence Proposals'
          )}
        </button>
      </form>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-semibold text-sm mb-2">How it works:</h4>
        <div className="text-blue-700 text-xs space-y-1">
          <p>• <strong>Macro:</strong> Major foundational influences (genres, movements, major works)</p>
          <p>• <strong>Micro:</strong> Specific techniques and elements (methods, regional scenes)</p>
          <p>• <strong>Nano:</strong> Tiny details and specifics (sounds, tools, personal moments)</p>
        </div>
      </div>
    </div>
  );
};

export default ResearchInterface;
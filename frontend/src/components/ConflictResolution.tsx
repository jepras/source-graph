import React, { useState } from 'react';
import { api } from '../services/api';
import type { StructuredOutput } from '../services/api';

interface ConflictResolutionProps {
  similarItems: any[];
  newData: StructuredOutput;
  onResolve: (resolution: 'create_new' | 'merge', selectedItemId?: string) => void;
  onCancel: () => void;
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  similarItems, newData, onResolve, onCancel
}) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleItemSelect = async (itemId: string) => {
    setSelectedItem(itemId);
    setPreviewLoading(true);
    
    try {
      const preview = await api.getItemPreview(itemId);
      setPreviewData(preview);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">
          ⚠️ Similar Items Found
        </h4>
        <p className="text-sm text-yellow-700">
          Found {similarItems.length} existing item(s) similar to "{newData.main_item}". 
          Please review before proceeding:
        </p>
      </div>
      
      {/* Similar Items List */}
      <div className="space-y-2">
        {similarItems.map((item) => (
          <label key={item.id} className="flex items-start space-x-3 p-2 border rounded hover:bg-yellow-100 cursor-pointer">
            <input
              type="radio"
              name="existing-item"
              value={item.id}
              onChange={() => handleItemSelect(item.id)}
              className="mt-1 text-blue-600"
            />
            <div className="flex-1 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-gray-600">
                    {item.auto_detected_type} • {item.year} • {item.verification_status}
                  </div>
                  {item.creators.length > 0 && (
                    <div className="text-gray-500">by {item.creators.join(', ')}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {item.similarity_score}% match<br/>
                  {item.existing_influences_count} influences
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Preview Section */}
      {selectedItem && (
        <div className="border-t border-yellow-300 pt-4">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">
            📋 Merge Preview
          </h5>
          
          {previewLoading ? (
            <div className="text-sm text-gray-500">Loading preview...</div>
          ) : previewData ? (
            <div className="bg-white rounded p-3 space-y-3 text-sm">
              {/* Existing Item Info */}
              <div>
                <h6 className="font-medium text-gray-800">Existing Item:</h6>
                <div className="text-gray-600 ml-2">
                  <div>📦 {previewData.main_item.name} ({previewData.main_item.auto_detected_type})</div>
                  <div>🏆 {previewData.main_item.verification_status}</div>
                  <div>📊 {previewData.existing_influences.length} existing influences</div>
                </div>
              </div>

              {/* New Influences to be Added */}
              <div>
                <h6 className="font-medium text-gray-800">New Influences to Add:</h6>
                <div className="ml-2 space-y-1">
                  {newData.influences.map((inf, idx) => (
                    <div key={idx} className="text-gray-600">
                      ➕ {inf.name} ({inf.category}) - {Math.round(inf.confidence * 100)}%
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate Check */}
              <div>
                <h6 className="font-medium text-gray-800">Duplicate Check:</h6>
                <div className="ml-2 text-xs">
                  {newData.influences.map((newInf, idx) => {
                    const isDuplicate = previewData.existing_influences.some(
                      (existingInf: any) => existingInf.name.toLowerCase() === newInf.name.toLowerCase()
                    );
                    return (
                      <div key={idx} className={isDuplicate ? "text-orange-600" : "text-green-600"}>
                        {isDuplicate ? "⚠️ " : "✅ "} {newInf.name} 
                        {isDuplicate ? " (already exists - will skip)" : " (new - will add)"}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-500">Failed to load preview</div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => onResolve('merge', selectedItem || undefined)}
          disabled={!selectedItem}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          🔀 Merge with Selected
        </button>
        <button
          onClick={() => onResolve('create_new')}
          className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
        >
          ➕ Create New Item
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
};
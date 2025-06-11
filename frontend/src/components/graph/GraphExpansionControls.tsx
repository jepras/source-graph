import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ExpansionCounts } from '../../services/api';

interface GraphExpansionControlsProps {
  selectedItemId: string | null;
  onExpand: (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => void;
  loading: boolean;
}

export const GraphExpansionControls: React.FC<GraphExpansionControlsProps> = ({
  selectedItemId,
  onExpand,
  loading
}) => {
  const [expansionCounts, setExpansionCounts] = useState<ExpansionCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    if (selectedItemId) {
      loadExpansionCounts(selectedItemId);
    } else {
      setExpansionCounts(null);
    }
  }, [selectedItemId]);

  const loadExpansionCounts = async (itemId: string) => {
    setCountsLoading(true);
    try {
      const counts = await api.getExpansionCounts(itemId);
      setExpansionCounts(counts);
    } catch (err) {
      console.error('Failed to load expansion counts:', err);
      setExpansionCounts(null);
    } finally {
      setCountsLoading(false);
    }
  };

  if (!selectedItemId || !expansionCounts) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">
        🔍 Expand Graph
      </h4>
      
      {countsLoading ? (
        <div className="text-sm text-gray-500">Loading expansion options...</div>
      ) : (
        <div className="space-y-2">
          {/* Expand incoming influences */}
          {expansionCounts.incoming_influences > 0 && (
            <button
              onClick={() => onExpand(selectedItemId, 'incoming')}
              disabled={loading}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
            >
              <span>⬅️ Show what influences this</span>
              <span className="font-medium">{expansionCounts.incoming_influences}</span>
            </button>
          )}
          
          {/* Expand outgoing influences */}
          {expansionCounts.outgoing_influences > 0 && (
            <button
              onClick={() => onExpand(selectedItemId, 'outgoing')}
              disabled={loading}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100 disabled:opacity-50"
            >
              <span>➡️ Show what this influences</span>
              <span className="font-medium">{expansionCounts.outgoing_influences}</span>
            </button>
          )}
          
          {/* Expand both directions */}
          {(expansionCounts.incoming_influences > 0 || expansionCounts.outgoing_influences > 0) && (
            <button
              onClick={() => onExpand(selectedItemId, 'both')}
              disabled={loading}
              className="w-full flex items-center justify-center px-3 py-2 text-sm bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100 disabled:opacity-50"
            >
              <span>🔄 Expand All Directions</span>
            </button>
          )}
          
          {expansionCounts.incoming_influences === 0 && expansionCounts.outgoing_influences === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">
              No additional influences to expand
            </div>
          )}
        </div>
      )}
    </div>
  );
};
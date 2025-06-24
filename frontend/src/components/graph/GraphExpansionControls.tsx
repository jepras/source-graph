import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ExpansionCounts } from '../../services/api';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

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
    <div className="bg-design-gray-1200 border border-design-gray-800 rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-design-gray-200 mb-3">
        🔍 Graph Expansion
      </h4>
      
      {countsLoading ? (
        <div className="text-sm text-design-gray-400">Loading expansion options...</div>
      ) : (
        <div className="space-y-2">
          {/* Expand incoming influences */}
          {expansionCounts.incoming_influences > 0 && (
            <Button
              onClick={() => onExpand(selectedItemId, 'incoming')}
              disabled={loading}
              variant="outline"
              className="w-full justify-between bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 hover:text-design-gray-100"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Show what influences this
              </span>
              <span className="font-medium text-design-red">{expansionCounts.incoming_influences}</span>
            </Button>
          )}
          
          {/* Expand outgoing influences */}
          {expansionCounts.outgoing_influences > 0 && (
            <Button
              onClick={() => onExpand(selectedItemId, 'outgoing')}
              disabled={loading}
              variant="outline"
              className="w-full justify-between bg-design-gray-950 border-design-gray-800 text-design-gray-300 hover:bg-design-gray-900 hover:text-design-gray-100"
            >
              <span className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Show what this influences
              </span>
              <span className="font-medium text-design-red">{expansionCounts.outgoing_influences}</span>
            </Button>
          )}
          
          {/* Expand both directions */}
          {(expansionCounts.incoming_influences > 0 || expansionCounts.outgoing_influences > 0) && (
            <Button
              onClick={() => onExpand(selectedItemId, 'both')}
              disabled={loading}
              className="w-full justify-center bg-design-red hover:bg-design-red-hover text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Expand All Directions
            </Button>
          )}
          
          {expansionCounts.incoming_influences === 0 && expansionCounts.outgoing_influences === 0 && (
            <div className="text-sm text-design-gray-400 text-center py-2">
              No additional influences to expand
            </div>
          )}
        </div>
      )}
    </div>
  );
};
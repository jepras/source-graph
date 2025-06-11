import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useGraph } from '../../contexts/GraphContext';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { GraphExpansionControls } from '../graph/GraphExpansionControls';
import type { Item, InfluenceRelation } from '../../services/api';

interface InfluenceData {
  incoming: InfluenceRelation[];
  outgoing: any[];
  loading: boolean;
  error: string | null;
}

export const ItemDetailsPanel: React.FC = () => {
  const { state, selectNode } = useGraph();
  const { expandNode } = useGraphOperations();
  const [itemDetails, setItemDetails] = useState<Item | null>(null);
  const [influenceData, setInfluenceData] = useState<InfluenceData>({
    incoming: [],
    outgoing: [],
    loading: false,
    error: null,
  });
  const [expandedSections, setExpandedSections] = useState({
    incoming: false,
    outgoing: false,
  });

  // Load item details and influence data when selectedNodeId changes
  useEffect(() => {
    if (!state.selectedNodeId) {
      setItemDetails(null);
      setInfluenceData({ incoming: [], outgoing: [], loading: false, error: null });
      return;
    }

    const loadItemData = async () => {
      setInfluenceData(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Load item details
        const item = await api.getItem(state.selectedNodeId!);
        setItemDetails(item);

        // Load incoming influences (what influenced this item)
        const incomingResponse = await api.getInfluences(state.selectedNodeId!);
        
        // Load outgoing influences (what this item influences)
        const outgoingResponse = await api.getOutgoingInfluences(state.selectedNodeId!);

        setInfluenceData({
          incoming: incomingResponse.influences,
          outgoing: outgoingResponse.outgoing_influences || [],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to load item data:', error);
        setInfluenceData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load item details',
        }));
      }
    };

    loadItemData();
  }, [state.selectedNodeId]);

  const toggleSection = (section: 'incoming' | 'outgoing') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleExpand = async (itemId: string, direction: 'incoming' | 'outgoing' | 'both') => {
    await expandNode(itemId, direction);
  };

  if (!state.selectedNodeId || !itemDetails) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-gray-500 text-center py-8">
            <div className="text-2xl mb-2">👆</div>
            <p>Click on an item in the graph to see details</p>
          </div>
        </div>
      </div>
    );
  }

  if (influenceData.loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-gray-500 text-center py-8">
            <div className="animate-spin h-6 w-6 mx-auto mb-2">⏳</div>
            <p>Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (influenceData.error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-red-500 text-center py-8">
            <div className="text-2xl mb-2">⚠️</div>
            <p>{influenceData.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800">
          Selected Item
        </h4>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Item Name and Basic Info */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-1">
            {itemDetails.name}
          </h5>
          {itemDetails.year && (
            <div className="text-xs text-gray-500 mb-2">
              {itemDetails.year}
            </div>
          )}
          {itemDetails.auto_detected_type && (
            <div className="text-xs text-gray-500 mb-2">
              Type: {itemDetails.auto_detected_type}
            </div>
          )}
          {itemDetails.description && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {itemDetails.description}
            </p>
          )}
        </div>

        {/* Graph Expansion Controls */}
        <GraphExpansionControls
          selectedItemId={state.selectedNodeId}
          onExpand={handleExpand}
          loading={state.loading}
        />

        {/* Incoming Influences Section */}
        <div>
          <button
            onClick={() => toggleSection('incoming')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>
              Influenced By ({influenceData.incoming.length})
            </span>
            <span className="text-gray-400">
              {expandedSections.incoming ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.incoming && (
            <div className="mt-2 space-y-3">
              {influenceData.incoming.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No known influences
                </div>
              ) : (
                influenceData.incoming.map((influence, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3">
                    <button
                      onClick={() => selectNode(influence.from_item.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-1"
                    >
                      {influence.from_item.name}
                    </button>
                    <div className="text-xs text-gray-500 mb-2">
                      {influence.category} • {influence.influence_type}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {influence.explanation}
                    </p>
                    {influence.confidence && (
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(influence.confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Outgoing Influences Section */}
        <div>
          <button
            onClick={() => toggleSection('outgoing')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>
              Influences ({influenceData.outgoing.length})
            </span>
            <span className="text-gray-400">
              {expandedSections.outgoing ? '▼' : '▶'}
            </span>
          </button>
          
          {expandedSections.outgoing && (
            <div className="mt-2 space-y-3">
              {influenceData.outgoing.length === 0 ? (
                <div className="text-sm text-gray-500 italic">
                  No known influences on other items
                </div>
              ) : (
                influenceData.outgoing.map((influence: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded p-3">
                    <button
                      onClick={() => selectNode(influence.to_item.id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-1"
                    >
                      {influence.to_item.name}
                    </button>
                    <div className="text-xs text-gray-500 mb-2">
                      {influence.category} • {influence.influence_type}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {influence.explanation}
                    </p>
                    {influence.confidence && (
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(influence.confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
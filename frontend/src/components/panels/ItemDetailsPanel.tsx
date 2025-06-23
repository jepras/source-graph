import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useGraph } from '../../contexts/GraphContext';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { GraphExpansionControls } from '../graph/GraphExpansionControls';
import { EnhancementPanel } from '../common/EnhancementPanel';
import type { Item, InfluenceRelation } from '../../services/api';
import type { GraphNode, GraphLink } from '../../types/graph';

interface InfluenceData {
  incoming: InfluenceRelation[];
  outgoing: any[];
  loading: boolean;
  error: string | null;
}

export const ItemDetailsPanel: React.FC = () => {
  const { state, selectNode, removeNodeFromGraph, addNodesAndLinks } = useGraph();
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Add this useEffect right after your existing useEffect for loading item data
  useEffect(() => {
    // Clear action states when selection changes
    setDeleteConfirm(false);
    setMergeMode(false);
    setMergeCandidates([]);
    setActionLoading(false);
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

  const handleDeleteClick = () => {
    setDeleteConfirm(true);
  };
  
  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      const nodeIdToDelete = state.selectedNodeId!;
      await api.deleteItem(nodeIdToDelete);
      
      // Remove the node from the graph (this also clears selection)
      removeNodeFromGraph(nodeIdToDelete);
      
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionLoading(false);
      setDeleteConfirm(false);
    }
  };
  
  const handleMergeClick = async () => {
    setActionLoading(true);
    try {
      const response = await api.getMergeCandidates(state.selectedNodeId!);
      setMergeCandidates(response.candidates);
      setMergeMode(true);
    } catch (error) {
      console.error('Failed to get merge candidates:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleMergeConfirm = async (targetId: string) => {
    setActionLoading(true);
    try {
      await api.mergeItems(state.selectedNodeId!, targetId);
      // Navigate to the target item
      selectNode(targetId);
      setMergeMode(false);
      setMergeCandidates([]);
    } catch (error) {
      console.error('Merge failed:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddInfluenceToGraph = async (influence: InfluenceRelation) => {
    try {
      // Get the full item details for the influence
      const influenceItem = await api.getItem(influence.from_item.id);
      
      // Create a graph node for the influence
      const newNode: GraphNode = {
        id: influenceItem.id,
        name: influenceItem.name,
        type: influenceItem.auto_detected_type || 'unknown',
        year: influenceItem.year,
        category: 'influence',
        clusters: influence.clusters || []
      };

      // Create a link from the influence to the current item
      const newLink: GraphLink = {
        source: influenceItem.id,
        target: state.selectedNodeId!,
        confidence: influence.confidence,
        influence_type: influence.influence_type,
        category: influence.category,
        explanation: influence.explanation
      };

      // Add to graph
      addNodesAndLinks([newNode], [newLink]);
      
    } catch (error) {
      console.error('Failed to add influence to graph:', error);
    }
  };

  const handleAddOutgoingInfluenceToGraph = async (influence: any) => {
    try {
      // Get the full item details for the influence
      const influenceItem = await api.getItem(influence.to_item.id);
      
      // Create a graph node for the influence
      const newNode: GraphNode = {
        id: influenceItem.id,
        name: influenceItem.name,
        type: influenceItem.auto_detected_type || 'unknown',
        year: influenceItem.year,
        category: 'influence',
        clusters: influence.clusters || []
      };

      // Create a link from the current item to the influence
      const newLink: GraphLink = {
        source: state.selectedNodeId!,
        target: influenceItem.id,
        confidence: influence.confidence,
        influence_type: influence.influence_type,
        category: influence.category,
        explanation: influence.explanation
      };

      // Add to graph
      addNodesAndLinks([newNode], [newLink]);
      
    } catch (error) {
      console.error('Failed to add outgoing influence to graph:', error);
    }
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

        {/* Graph Actions Section */}
        <div className="border-t border-gray-200 pt-4">
          <h6 className="text-xs font-medium text-gray-700 mb-3">🔍 Graph Actions</h6>
          
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => {/* placeholder */}}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              disabled
            >
              ✏️ Edit
            </button>
            
            <button
              onClick={deleteConfirm ? handleDeleteConfirm : handleDeleteClick}
              disabled={actionLoading}
              className={`px-3 py-1 text-xs rounded ${
                deleteConfirm 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              {actionLoading ? '...' : deleteConfirm ? 'Are you sure?' : '🗑️ Delete'}
            </button>
            
            <button
              onClick={handleMergeClick}
              disabled={actionLoading || mergeMode}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              {actionLoading ? '...' : '🔗 Merge'}
            </button>
          </div>

          {/* Merge Candidates */}
          {mergeMode && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 mb-2">
                Merge "{itemDetails.name}" into:
              </div>
              
              {mergeCandidates.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
                  No similar items found for merging
                </div>
              ) : (
                mergeCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    onClick={() => handleMergeConfirm(candidate.id)}
                    className="p-2 border border-gray-200 rounded cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="text-xs font-medium text-gray-900">{candidate.name}</div>
                    <div className="text-xs text-gray-500">
                      {candidate.year && `${candidate.year} • `}
                      {candidate.auto_detected_type}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {candidate.existing_influences_count} influences • {candidate.similarity_score}% match
                    </div>
                  </div>
                ))
              )}
              
              <button
                onClick={() => {setMergeMode(false); setMergeCandidates([]);}}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Graph Expansion Controls */}
        <GraphExpansionControls
          selectedItemId={state.selectedNodeId}
          onExpand={handleExpand}
          loading={state.loading}
        />

        {/* Enhancement Panel */}
        <div className="border-t border-gray-200 pt-4">
          <EnhancementPanel
            itemId={state.selectedNodeId!}
            itemName={itemDetails.name}
          />
        </div>

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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                      <button
                        onClick={() => handleAddInfluenceToGraph(influence)}
                        className="ml-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        title="Add this influence to the graph"
                      >
                        Add to graph
                      </button>
                    </div>
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
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
                      <button
                        onClick={() => handleAddOutgoingInfluenceToGraph(influence)}
                        className="ml-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        title="Add this influence to the graph"
                      >
                        Add to graph
                      </button>
                    </div>
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
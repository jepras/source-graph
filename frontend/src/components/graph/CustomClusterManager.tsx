import React, { useState } from 'react';
import { useGraph } from '../../contexts/GraphContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2, Edit, Check, X } from 'lucide-react';

export const CustomClusterManager: React.FC = () => {
  const { state, dispatch } = useGraph();
  const { customClusters, accumulatedGraph } = state;
  const [newClusterName, setNewClusterName] = useState('');
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [editingClusterName, setEditingClusterName] = useState('');

  const handleAddCluster = () => {
    if (newClusterName.trim() === '') return;
    const newCluster = {
      id: `custom-${Date.now()}`,
      name: newClusterName.trim(),
      nodeIds: [],
    };
    dispatch({ type: 'ADD_CUSTOM_CLUSTER', payload: newCluster });
    setNewClusterName('');
  };

  const handleDeleteCluster = (clusterId: string) => {
    dispatch({ type: 'DELETE_CUSTOM_CLUSTER', payload: clusterId });
  };

  const handleStartEditing = (cluster: any) => {
    setEditingClusterId(cluster.id);
    setEditingClusterName(cluster.name);
  };

  const handleCancelEditing = () => {
    setEditingClusterId(null);
    setEditingClusterName('');
  };

  const handleUpdateClusterName = () => {
    if (!editingClusterId || editingClusterName.trim() === '') return;
    dispatch({
      type: 'UPDATE_CUSTOM_CLUSTER',
      payload: { clusterId: editingClusterId, updates: { name: editingClusterName.trim() } },
    });
    handleCancelEditing();
  };

  const handleMoveNode = (nodeId: string, newClusterId: string) => {
    dispatch({ type: 'MOVE_NODE_TO_CLUSTER', payload: { nodeId, newClusterId } });
  };

  return (
    <div className="bg-design-gray-1200 border border-design-gray-800 rounded-lg shadow-sm">
      <h4 className="text-sm font-semibold text-design-gray-200 mb-3">Custom Clusters</h4>
      <div className="space-y-2">
        {customClusters.map(cluster => (
          <div key={cluster.id} className="p-2 bg-design-gray-950 rounded-md">
            <div className="flex items-center justify-between">
              {editingClusterId === cluster.id ? (
                <Input
                  type="text"
                  value={editingClusterName}
                  onChange={e => setEditingClusterName(e.target.value)}
                  className="h-8 bg-design-gray-900"
                />
              ) : (
                <span className="font-semibold text-design-gray-300">{cluster.name}</span>
              )}
              <div className="flex items-center space-x-2">
                {editingClusterId === cluster.id ? (
                  <>
                    <Button size="icon" variant="ghost" onClick={handleUpdateClusterName}><Check className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEditing}><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    {cluster.id !== 'research-focus' && cluster.id !== 'uncategorized' && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => handleStartEditing(cluster)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteCluster(cluster.id)}><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {cluster.nodeIds.map(nodeId => {
                const node = accumulatedGraph.nodes.get(nodeId);
                if (!node) return null;
                return (
                  <div key={nodeId} className="flex items-center justify-between text-sm text-design-gray-400">
                    <span>{node.name}</span>
                    {cluster.id !== 'research-focus' && (
                      <select
                        value={cluster.id}
                        onChange={e => handleMoveNode(nodeId, e.target.value)}
                        className="bg-design-gray-900 border-design-gray-800 rounded-md p-1 text-xs"
                      >
                        {customClusters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex space-x-2">
        <Input
          type="text"
          placeholder="New cluster name"
          value={newClusterName}
          onChange={e => setNewClusterName(e.target.value)}
          className="h-8 bg-design-gray-900"
        />
        <Button onClick={handleAddCluster} size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>
    </div>
  );
};
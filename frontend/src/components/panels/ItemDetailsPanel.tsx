import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { X, Wand2, ExternalLink, Music, Film, BookOpen, Info, Share2, Edit, Trash2, ChevronDown, Save, X as XIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useGraph } from '../../contexts/GraphContext';
import { useGraphOperations } from '../../hooks/useGraphOperations';
import { GraphExpansionControls } from '../graph/GraphExpansionControls';
import type { Item, InfluenceRelation } from '../../services/api';
import type { GraphNode, GraphLink } from '../../types/graph';
import { EnhancementPanel } from '../common/EnhancementPanel';

interface InfluenceData {
  incoming: InfluenceRelation[];
  outgoing: any[];
  loading: boolean;
  error: string | null;
}

interface AIContentItem {
  id: string;
  type: "spotify" | "youtube" | "wikipedia" | "image" | "imdb" | "genius";
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  isLoading?: boolean;
}

interface ResearchLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  status: "Added" | "Generated" | "Edited" | "Completed";
  expanded?: boolean;
}

interface ItemDetailsPanelProps {
  onClose?: () => void;
}

export const ItemDetailsPanel: React.FC<ItemDetailsPanelProps> = ({ onClose }) => {
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
  const [activeTab, setActiveTab] = useState("overview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<AIContentItem[]>([]);
  const [showFullDetails, setShowFullDetails] = useState<Record<string, boolean>>({});
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    year: '',
    auto_detected_type: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Mock research log data
  const researchLog: ResearchLogItem[] = [
    {
      id: "1",
      timestamp: "2024-01-20 14:30",
      user: "System",
      action: "Created",
      details: "Initial item creation with basic details.",
      status: "Added",
      expanded: false,
    },
    {
      id: "2",
      timestamp: "2024-01-21 09:15",
      user: "AI",
      action: "Updated",
      details: "Added a more detailed description and influence categories.",
      status: "Edited",
      expanded: false,
    },
    {
      id: "3",
      timestamp: "2024-01-22 16:45",
      user: "AI",
      action: "Generated",
      details: "AI-generated content added to the overview.",
      status: "Generated",
      expanded: false,
    },
    {
      id: "4",
      timestamp: "2024-01-23 11:00",
      user: "System",
      action: "Linked",
      details: "Connected to related items in the knowledge graph.",
      status: "Completed",
      expanded: false,
    },
  ];

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

  // Clear action states when selection changes
  useEffect(() => {
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
        clusters: influence.clusters || [],
        description: influenceItem.description
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
        clusters: influence.clusters || [],
        description: influenceItem.description
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

  const handleGenerateContent = () => {
    setIsGenerating(true);
    // Mock AI content generation
    setTimeout(() => {
      setAiContent([
        {
          id: "1",
          type: "spotify",
          title: "Listen on Spotify",
          description: "Stream this track on Spotify",
          url: "https://spotify.com",
          thumbnail: "/spotify-icon.png",
        },
        {
          id: "2",
          type: "youtube",
          title: "Watch on YouTube",
          description: "Official music video",
          url: "https://youtube.com",
          thumbnail: "/youtube-icon.png",
        },
      ]);
      setIsGenerating(false);
    }, 2000);
  };

  const toggleHistoryEntry = (id: string) => {
    setShowFullDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getHistoryIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "➕";
      case "updated":
        return "✏️";
      case "generated":
        return "🤖";
      case "linked":
        return "🔗";
      default:
        return "📝";
    }
  };

  const renderContentItem = (item: AIContentItem) => {
    switch (item.type) {
      case "spotify":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800">
            <div className="flex items-center p-3">
              <div className="flex-shrink-0 mr-3">
                <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-12 h-12 rounded" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-design-gray-100 truncate">{item.title}</h4>
                <p className="text-xs text-design-gray-400">{item.description}</p>
              </div>
              <Button size="sm" variant="ghost" className="ml-2 text-design-red hover:text-design-red-hover hover:bg-black">
                <Music className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case "youtube":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800">
            <div className="aspect-video bg-black relative">
              <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[16px] border-l-white border-b-[8px] border-b-transparent ml-1"></div>
                </div>
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium text-design-gray-100">{item.title}</h4>
              <p className="text-xs text-design-gray-400 mt-1">{item.description}</p>
            </div>
          </div>
        );

      case "imdb":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800 p-3">
            <div className="flex">
              <div className="flex-shrink-0 mr-3">
                <img
                  src={item.thumbnail || "/placeholder.svg"}
                  alt={item.title}
                  className="w-12 h-18 rounded object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <h4 className="text-sm font-medium text-design-gray-100">{item.title}</h4>
                  <Badge
                    variant="outline"
                    className="ml-2 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[10px]"
                  >
                    IMDb
                  </Badge>
                </div>
                <p className="text-xs text-design-gray-400 mt-1">{item.description}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 text-xs text-design-gray-300 hover:text-design-gray-100 hover:bg-black"
                >
                  <Film className="w-3 h-3 mr-1" /> View details
                </Button>
              </div>
            </div>
          </div>
        );

      case "wikipedia":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800 p-3">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 text-design-gray-400 mr-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-design-gray-100">{item.title}</h4>
                <p className="text-xs text-design-gray-400 mt-1">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-design-gray-400 hover:text-design-gray-100 hover:bg-black"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800">
            <div className="aspect-video bg-black">
              <img src={item.thumbnail || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <h4 className="text-sm font-medium text-design-gray-100">{item.title}</h4>
              <p className="text-xs text-design-gray-400 mt-1">{item.description}</p>
            </div>
          </div>
        );

      case "genius":
        return (
          <div className="bg-design-gray-1200 rounded-md overflow-hidden border border-design-gray-800 p-3">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mr-3">
                <span className="text-black font-bold text-xs">G</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-design-gray-100">{item.title}</h4>
                <p className="text-xs text-design-gray-400 mt-1">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-design-gray-400 hover:text-design-gray-100 hover:bg-black"
                asChild
              >
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Edit handlers
  const handleEditClick = () => {
    if (!itemDetails) return;
    
    setEditForm({
      name: itemDetails.name || '',
      description: itemDetails.description || '',
      year: itemDetails.year?.toString() || '',
      auto_detected_type: itemDetails.auto_detected_type || '',
    });
    setIsEditing(true);
    setEditError(null);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: '',
      description: '',
      year: '',
      auto_detected_type: '',
    });
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!itemDetails) return;
    
    setEditLoading(true);
    setEditError(null);
    
    try {
      const updateData: any = {};
      
      if (editForm.name !== itemDetails.name) updateData.name = editForm.name;
      if (editForm.description !== itemDetails.description) updateData.description = editForm.description;
      if (editForm.year !== (itemDetails.year?.toString() || '')) {
        updateData.year = editForm.year ? parseInt(editForm.year) : null;
      }
      if (editForm.auto_detected_type !== itemDetails.auto_detected_type) {
        updateData.auto_detected_type = editForm.auto_detected_type;
      }
      
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        setEditLoading(false);
        return;
      }
      
      const response = await api.updateItem(itemDetails.id, updateData);
      
      if (response.success) {
        setItemDetails(response.item);
        setIsEditing(false);
        setEditForm({
          name: '',
          description: '',
          year: '',
          auto_detected_type: '',
        });
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      setEditError(error instanceof Error ? error.message : 'Failed to update item');
    } finally {
      setEditLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!state.selectedNodeId || !itemDetails) {
    return (
      <div className="h-full flex flex-col bg-design-gray-1100">
        <div className="p-4 border-b border-design-gray-800">
          <h4 className="text-sm font-semibold text-design-gray-200">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-design-gray-400 text-center py-8">
            <div className="text-2xl mb-2">👆</div>
            <p>Click on an item in the graph to see details</p>
          </div>
        </div>
      </div>
    );
  }

  if (influenceData.loading) {
    return (
      <div className="h-full flex flex-col bg-design-gray-950">
        <div className="p-4 border-b border-design-gray-800">
          <h4 className="text-sm font-semibold text-design-gray-200">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-design-gray-400 text-center py-8">
            <div className="animate-spin h-6 w-6 mx-auto mb-2">⏳</div>
            <p>Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (influenceData.error) {
    return (
      <div className="h-full flex flex-col bg-design-gray-950">
        <div className="p-4 border-b border-design-gray-800">
          <h4 className="text-sm font-semibold text-design-gray-200">
            Selected Item
          </h4>
        </div>
        <div className="flex-1 p-4">
          <div className="text-sm text-red-400 text-center py-8">
            <div className="text-2xl mb-2">⚠️</div>
            <p>{influenceData.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-design-gray-1100">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-design-gray-800">
        <h3 className="font-medium text-design-gray-100">Item Details</h3>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="w-6 h-6 p-0 text-design-gray-400 hover:text-design-gray-100 hover:bg-design-gray-900 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="w-full bg-design-gray-1200">
              <TabsTrigger
                value="overview"
                className="flex-1 data-[state=active]:bg-design-red data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="connections"
                className="flex-1 data-[state=active]:bg-design-red data-[state=active]:text-white"
              >
                Connections
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-1 data-[state=active]:bg-design-red data-[state=active]:text-white"
              >
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 pt-6 space-y-6">
            {/* Title and Type */}
            <div>
              <h2 className="text-xl font-bold text-design-gray-100">{itemDetails.name}</h2>
              <div className="flex items-center mt-1 space-x-2">
                {itemDetails.year && (
                  <span className="text-sm text-design-gray-400">{itemDetails.year}</span>
                )}
                <Badge variant="outline" className="bg-design-red/10 text-design-red border-design-red/20">
                  {itemDetails.auto_detected_type || 'unknown'}
                </Badge>
                {itemDetails.verification_status && (
                  <>
                    <span className="text-design-gray-500">•</span>
                    <Badge variant="outline" className="bg-design-red/10 text-design-red border-design-red/20">
                      {itemDetails.verification_status}
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditClick}
                disabled={isEditing}
                className="bg-design-gray-900 border-design-gray-800 hover:bg-black text-xs text-design-gray-400 hover:text-design-gray-100"
              >
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeNodeFromGraph(state.selectedNodeId!)}
                className="bg-design-gray-900 border-design-gray-800 hover:bg-black text-xs text-design-gray-400 hover:text-design-gray-100"
              >
                <X className="w-3 h-3 mr-1" /> Remove from graph
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deleteConfirm ? handleDeleteConfirm : handleDeleteClick}
                disabled={actionLoading}
                className={`text-xs ${
                  deleteConfirm 
                    ? 'bg-red-600 text-white hover:bg-red-700 border-red-600' 
                    : 'bg-design-gray-900 border-design-gray-800 text-red-400 hover:bg-red-900/20 hover:text-red-300'
                }`}
              >
                {actionLoading ? '...' : deleteConfirm ? 'Are you sure?' : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </>
                )}
              </Button>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="bg-design-gray-1200 border border-design-gray-800 rounded-md p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-design-gray-300">Edit Item</h3>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={handleEditSave}
                      disabled={editLoading}
                      className="h-7 text-xs bg-design-red hover:bg-design-red-hover text-white"
                    >
                      {editLoading ? "Saving..." : (
                        <>
                          <Save className="w-3 h-3 mr-1" /> Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditCancel}
                      disabled={editLoading}
                      className="h-7 text-xs bg-design-gray-900 border-design-gray-800 text-design-gray-400 hover:text-design-gray-100"
                    >
                      <XIcon className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
                
                {editError && (
                  <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">
                    {editError}
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-design-gray-400 mb-1">Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Item name"
                      className="bg-design-gray-1100 border-design-gray-800 text-design-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-design-gray-400 mb-1">Year</label>
                    <Input
                      value={editForm.year}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      placeholder="Year (e.g., 1995)"
                      className="bg-design-gray-1100 border-design-gray-800 text-design-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-design-gray-400 mb-1">Type</label>
                    <Input
                      value={editForm.auto_detected_type}
                      onChange={(e) => handleInputChange('auto_detected_type', e.target.value)}
                      placeholder="Type (e.g., song, movie, innovation)"
                      className="bg-design-gray-1100 border-design-gray-800 text-design-gray-100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-design-gray-400 mb-1">Description</label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Description of the item"
                      className="bg-design-gray-1100 border-design-gray-800 text-design-gray-100"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {!isEditing && (
              <div>
                <h3 className="text-sm font-medium text-design-gray-300 mb-2 flex items-center">
                  <Info className="w-3 h-3 mr-1" /> Description
                </h3>
                <p className="text-sm text-design-gray-400 leading-relaxed">
                  {itemDetails.description || "No description available."}
                </p>
              </div>
            )}

            {/* AI Content Generator */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-design-gray-300 flex items-center">
                  <Wand2 className="w-3 h-3 mr-1" /> AI-Generated Content
                </h3>
                <Button
                  size="sm"
                  onClick={handleGenerateContent}
                  disabled={isGenerating}
                  className="h-7 text-xs bg-design-red hover:bg-design-red-hover text-white"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>

              {isGenerating ? (
                <div className="space-y-3">
                  <div className="h-20 w-full bg-design-gray-1200" />
                  <div className="h-40 w-full bg-design-gray-1200" />
                  <div className="h-20 w-full bg-design-gray-1200" />
                </div>
              ) : aiContent.length > 0 ? (
                <div className="space-y-3">
                  {aiContent.map((item) => (
                    <div key={item.id}>{renderContentItem(item)}</div>
                  ))}
                </div>
              ) : (
                <div className="bg-design-gray-1200 border border-design-gray-800 rounded-md p-4 text-center">
                  <Wand2 className="w-5 h-5 text-design-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-design-gray-400">
                    Click "Generate" to discover related content from various sources
                  </p>
                  <p className="text-xs text-design-gray-500 mt-1">Includes Spotify, YouTube, Wikipedia, IMDB, and more</p>
                </div>
              )}
            </div>

            {/* Enhancement Panel */}
            <div>
              
              <EnhancementPanel
                itemId={state.selectedNodeId!}
                itemName={itemDetails.name}
              />
            </div>
          </TabsContent>

          <TabsContent value="connections" className="p-4">
            <div className="space-y-4">
              {/* Graph Expansion Controls */}
              <div>
                <h3 className="text-sm font-medium text-design-gray-300 mb-2">Graph Actions</h3>
                <GraphExpansionControls
                  selectedItemId={state.selectedNodeId}
                  onExpand={handleExpand}
                  loading={state.loading}
                />
              </div>

              {/* Incoming Influences */}
              <div>
                <h3 className="text-sm font-medium text-design-gray-300 mb-2">Influenced By</h3>
                {influenceData.incoming.length > 0 ? (
                  <div className="space-y-3">
                    {influenceData.incoming.map((influence, index) => (
                      <div key={index} className="bg-design-gray-1200 rounded p-3 border border-design-gray-800">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <button
                              onClick={() => selectNode(influence.from_item.id)}
                              className="text-sm font-medium text-design-red hover:text-design-red-hover mb-1"
                            >
                              {influence.from_item.name}
                            </button>
                            <div className="text-xs text-design-gray-400 mb-2">
                              {influence.category} • {influence.influence_type}
                            </div>
                            <p className="text-sm text-design-gray-300 leading-relaxed">
                              {influence.explanation}
                            </p>
                            {influence.confidence && (
                              <div className="text-xs text-design-gray-500 mt-1">
                                Confidence: {Math.round(influence.confidence * 100)}%
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddInfluenceToGraph(influence)}
                            className="ml-2 px-3 py-1 text-xs bg-design-red text-design-gray-100 rounded hover:bg-design-red-hover transition-colors"
                            title="Add this influence to the graph"
                          >
                            Add to graph
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-design-gray-400">No known influences.</p>
                )}
              </div>

              {/* Outgoing Influences */}
              <div>
                <h3 className="text-sm font-medium text-design-gray-300 mb-2">Influences</h3>
                {influenceData.outgoing.length > 0 ? (
                  <div className="space-y-3">
                    {influenceData.outgoing.map((influence: any, index: number) => (
                      <div key={index} className="bg-design-gray-1200 rounded p-3 border border-design-gray-800">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <button
                              onClick={() => selectNode(influence.to_item.id)}
                              className="text-sm font-medium text-design-red hover:text-design-red-hover mb-1"
                            >
                              {influence.to_item.name}
                            </button>
                            <div className="text-xs text-design-gray-400 mb-2">
                              {influence.category} • {influence.influence_type}
                            </div>
                            <p className="text-sm text-design-gray-300 leading-relaxed">
                              {influence.explanation}
                            </p>
                            {influence.confidence && (
                              <div className="text-xs text-design-gray-500 mt-1">
                                Confidence: {Math.round(influence.confidence * 100)}%
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddOutgoingInfluenceToGraph(influence)}
                            className="ml-2 px-3 py-1 text-xs bg-design-red text-design-gray-100 rounded hover:bg-design-red-hover transition-colors"
                            title="Add this influence to the graph"
                          >
                            Add to graph
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-design-gray-400">No known items influenced by this.</p>
                )}
              </div>

              {/* Merge Section */}
              <div>
                <h3 className="text-sm font-medium text-design-gray-300 mb-2">Merge Options</h3>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMergeClick}
                    disabled={actionLoading || mergeMode}
                    className="bg-design-gray-900 border-design-gray-800 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                  >
                    {actionLoading ? '...' : '🔗 Merge'}
                  </Button>
                </div>

                {/* Merge Candidates */}
                {mergeMode && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-design-gray-400 mb-2">
                      Merge "{itemDetails.name}" into:
                    </div>
                    
                    {mergeCandidates.length === 0 ? (
                      <div className="text-xs text-design-gray-500 italic p-2 bg-design-gray-1200 rounded border border-design-gray-800">
                        No similar items found for merging
                      </div>
                    ) : (
                      mergeCandidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => handleMergeConfirm(candidate.id)}
                          className="p-2 border border-design-gray-800 rounded cursor-pointer hover:border-design-red/50 hover:bg-design-gray-1200"
                        >
                          <div className="text-xs font-medium text-design-gray-200">{candidate.name}</div>
                          <div className="text-xs text-design-gray-400">
                            {candidate.year && `${candidate.year} • `}
                            {candidate.auto_detected_type}
                          </div>
                          <div className="text-xs text-design-gray-500 mt-1">
                            {candidate.existing_influences_count} influences • {candidate.similarity_score}% match
                          </div>
                        </div>
                      ))
                    )}
                    
                    <button
                      onClick={() => {setMergeMode(false); setMergeCandidates([]);}}
                      className="text-xs text-design-gray-500 hover:text-design-gray-300 underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="p-4">
            <div className="bg-black backdrop-blur-sm border border-design-gray-800 rounded-lg">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3 border-b border-design-gray-800 pb-2">
                  <h4 className="text-sm font-medium text-design-gray-100">Item History</h4>
                  <div className="flex space-x-2">
                    <span className="text-xs text-design-gray-400 bg-design-gray-1200 px-2 py-1 rounded">Latest</span>
                    <span className="text-xs text-design-gray-500 bg-design-gray-950 px-2 py-1 rounded border border-design-gray-800">
                      Viewing
                    </span>
                  </div>
                </div>
                <div className="space-y-0 max-h-60 overflow-y-auto">
                  {researchLog.map((entry, index) => (
                    <div key={entry.id}>
                      <button
                        onClick={() => toggleHistoryEntry(entry.id)}
                        className="w-full flex items-start space-x-3 py-2 hover:bg-design-gray-1200 rounded transition-colors"
                      >
                        {/* Timeline thread */}
                        <div className="flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-black border-2 border-design-red flex items-center justify-center flex-shrink-0">
                            <span className="text-xs">{getHistoryIcon(entry.action)}</span>
                          </div>
                          {index < researchLog.length - 1 && <div className="w-0.5 h-6 bg-black mt-1"></div>}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-design-gray-300 truncate">
                              {entry.user} - {entry.action}
                            </p>
                            <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                              <span className="text-xs text-design-gray-500">{entry.status}</span>
                              <ChevronDown
                                className={`w-3 h-3 text-design-gray-500 transition-transform ${
                                  showFullDetails[entry.id] ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-design-gray-500">{entry.timestamp}</p>
                        </div>
                      </button>
                      {showFullDetails[entry.id] && (
                        <div className="ml-8 pb-2">
                          <p className="text-xs text-design-gray-500 leading-relaxed">{entry.details}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
export interface Item {
  id: string;
  name: string;
  auto_detected_type?: string;  // Changed from 'type' to 'auto_detected_type'
  year?: number;
  description?: string;
  confidence_score?: number;
  verification_status?: string;
}

export interface Creator {
  id: string;
  name: string;
  type: string;  // person/organization/collective
}

export interface InfluenceRelation {
  from_item: Item;
  to_item: Item;
  confidence: number;
  influence_type: string;
  explanation: string;
  category: string;
  source?: string;
}

export interface GraphResponse {
  main_item: Item;
  influences: InfluenceRelation[];
  categories: string[];
  creators: Creator[];  // Added creators
}

export interface ResearchRequest {
  item_name: string;
  // Removed item_type - LLM auto-detects
  // Removed artist - now handled as creator
  creator?: string;  // Optional creator field
}

export interface ResearchResponse {
  item_name: string;
  item_type: string;
  artist?: string;  // Keep for backward compatibility with research agent
  influences_text: string;
  success: boolean;
  error_message?: string;
}

export interface StructuredInfluence {
  name: string;
  type?: string;
  creator_name?: string;
  creator_type?: string;
  year?: number;
  category: string;
  influence_type: string;
  confidence: number;
  explanation: string;
  source?: string;
}

export interface StructuredOutput {
  main_item: string;
  main_item_type?: string;
  main_item_creator?: string;
  main_item_creator_type?: string;
  main_item_year?: number;
  influences: StructuredInfluence[];
  categories: string[];
}

export interface StructureRequest {
  influences_text: string;
  main_item: string;
  main_item_creator?: string;  // Updated to match backend
}

export interface ExpansionCounts {
  incoming_influences: number;
  outgoing_influences: number;
}

export interface ExpandedGraph {
  nodes: Array<{
    item: Item;
    creators: Creator[];
    is_center: boolean;
  }>;
  relationships: Array<{
    from_id: string;
    to_id: string;
    confidence: number;
    influence_type: string;
    explanation: string;
    category: string;
    source?: string;
  }>;
  center_item_id: string;
}

const API_BASE = 'http://localhost:8000/api';

export const api = {
  searchItems: async (query: string): Promise<Item[]> => {
    const response = await fetch(`${API_BASE}/items/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },

  getItem: async (itemId: string): Promise<Item> => {
    const response = await fetch(`${API_BASE}/items/${itemId}`);
    if (!response.ok) throw new Error('Item not found');
    return response.json();
  },

  getInfluences: async (itemId: string): Promise<GraphResponse> => {
    const response = await fetch(`${API_BASE}/items/${itemId}/influences`);
    if (!response.ok) throw new Error('Influences not found');
    return response.json();
  },

  researchInfluences: async (request: ResearchRequest): Promise<ResearchResponse> => {
    const response = await fetch(`${API_BASE}/ai/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item_name: request.item_name,
        item_type: "unknown",  // Placeholder - LLM will auto-detect
        artist: request.creator  // Map creator to artist for backward compatibility
      }),
    });
    if (!response.ok) throw new Error('AI research failed');
    return response.json();
  },

  structureInfluences: async (request: StructureRequest): Promise<StructuredOutput> => {
    const response = await fetch(`${API_BASE}/ai/structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('AI structure failed');
    return response.json();
  },

  saveStructuredInfluences: async (structuredData: StructuredOutput): Promise<{ item_id: string }> => {
    const response = await fetch(`${API_BASE}/influences/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(structuredData),
    });
    if (!response.ok) throw new Error('Failed to save influences');
    return response.json();
  },

  checkAIHealth: async (): Promise<{ status: string; ai_service: string }> => {
    const response = await fetch(`${API_BASE}/ai/health`);
    if (!response.ok) throw new Error('AI health check failed');
    return response.json();
  },

  getItemPreview: async (itemId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/influences/preview/${itemId}`);
    if (!response.ok) throw new Error('Failed to get preview');
    return response.json();
  },

  forceSaveAsNew: async (structuredData: StructuredOutput): Promise<{ success: boolean; item_id: string; message: string }> => {
    const response = await fetch(`${API_BASE}/influences/force-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(structuredData),
    });
    if (!response.ok) throw new Error('Failed to force save');
    return response.json();
  },

  mergeWithExisting: async (existingItemId: string, newData: StructuredOutput): Promise<{ success: boolean; item_id: string; message: string }> => {
    const response = await fetch(`${API_BASE}/influences/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        existing_item_id: existingItemId,
        new_data: newData
      }),
    });
    if (!response.ok) throw new Error('Failed to merge');
    return response.json();
  },

  getExpansionCounts: async (itemId: string): Promise<ExpansionCounts> => {
    const response = await fetch(`${API_BASE}/items/${itemId}/expansion-counts`);
    if (!response.ok) throw new Error('Failed to get expansion counts');
    return response.json();
  },

  getOutgoingInfluences: async (itemId: string): Promise<any> => {
    const response = await fetch(`${API_BASE}/items/${itemId}/influences-outgoing`);
    if (!response.ok) throw new Error('Failed to get outgoing influences');
    return response.json();
  },

  getExpandedGraph: async (
    itemId: string, 
    includeIncoming: boolean = true, 
    includeOutgoing: boolean = true,
    maxDepth: number = 2
  ): Promise<ExpandedGraph> => {
    const params = new URLSearchParams({
      include_incoming: includeIncoming.toString(),
      include_outgoing: includeOutgoing.toString(),
      max_depth: maxDepth.toString()
    });
    const response = await fetch(`${API_BASE}/items/${itemId}/expanded-graph?${params}`);
    if (!response.ok) throw new Error('Failed to get expanded graph');
    return response.json();
  },
};

// Add this AFTER your existing api object (after the closing brace and semicolon)

// Convert expanded graph format to the GraphResponse format that your visualization expects
export const convertExpandedGraphToGraphResponse = (expandedGraph: ExpandedGraph): GraphResponse => {
  // Find the center item
  const centerNode = expandedGraph.nodes.find(node => node.is_center);
  if (!centerNode) {
    throw new Error('No center item found in expanded graph');
  }

  // Convert relationships to InfluenceRelation format
  const influences: InfluenceRelation[] = expandedGraph.relationships.map(rel => {
    const fromNode = expandedGraph.nodes.find(node => node.item.id === rel.from_id);
    const toNode = expandedGraph.nodes.find(node => node.item.id === rel.to_id);
    
    if (!fromNode || !toNode) {
      throw new Error(`Invalid relationship: missing nodes for ${rel.from_id} -> ${rel.to_id}`);
    }

    return {
      from_item: fromNode.item,
      to_item: toNode.item,
      confidence: rel.confidence,
      influence_type: rel.influence_type,
      explanation: rel.explanation,
      category: rel.category,
      source: rel.source
    };
  });

  // Get all creators from all nodes (remove duplicates)
  const allCreators: Creator[] = [];
  const creatorIds = new Set<string>();
  
  expandedGraph.nodes.forEach(node => {
    node.creators.forEach(creator => {
      if (!creatorIds.has(creator.id)) {
        allCreators.push(creator);
        creatorIds.add(creator.id);
      }
    });
  });

  // Get unique categories
  const categories = [...new Set(expandedGraph.relationships.map(rel => rel.category).filter(cat => cat))];

  return {
    main_item: centerNode.item,
    influences,
    categories,
    creators: allCreators
  };
};
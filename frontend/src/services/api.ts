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
  }
};
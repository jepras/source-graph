export interface Item {
    id: string;
    name: string;
    type: string;
    year?: number;
    description?: string;
    artist?: string;
  }
  
  export interface InfluenceRelation {
    from_item: Item;
    to_item: Item;
    confidence: number;
    influence_type: string;
    source?: string;
  }
  
  export interface GraphResponse {
    main_item: Item;
    influences: InfluenceRelation[];
    categories: string[];
  }

  export interface ResearchRequest {
    item_name: string;
    item_type: string;
    artist?: string;
  }
  
  export interface ResearchResponse {
    item_name: string;
    item_type: string;
    artist?: string;
    influences_text: string;
    success: boolean;
    error_message?: string;
  }
  
  const API_BASE = 'http://localhost:8000/api';
  
  export const api = {
    searchItems: async (query: string): Promise<Item[]> => {
      console.log('API: searchItems called with query:', query);
      const url = `${API_BASE}/items/search?q=${encodeURIComponent(query)}`;
      console.log('API: Calling URL:', url);
      const response = await fetch(url);
      console.log('API: Search response status:', response.status);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      console.log('API: Search response data:', data);
      return data;
    },
  
    getItem: async (itemId: string): Promise<Item> => {
      console.log('API: getItem called with id:', itemId);
      const url = `${API_BASE}/items/${itemId}`;
      console.log('API: Calling URL:', url);
      const response = await fetch(url);
      console.log('API: Get item response status:', response.status);
      if (!response.ok) throw new Error('Item not found');
      const data = await response.json();
      console.log('API: Get item response data:', data);
      return data;
    },
  
    getInfluences: async (itemId: string): Promise<GraphResponse> => {
      console.log('API: getInfluences called with id:', itemId);
      const url = `${API_BASE}/items/${itemId}/influences`;
      console.log('API: Calling URL:', url);
      const response = await fetch(url);
      console.log('API: Get influences response status:', response.status);
      if (!response.ok) throw new Error('Influences not found');
      const data = await response.json();
      console.log('API: Get influences response data:', data);
      return data;
    },

    // New AI research methods
    researchInfluences: async (request: ResearchRequest): Promise<ResearchResponse> => {
      const response = await fetch(`${API_BASE}/ai/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('AI research failed');
      return response.json();
    },

    checkAIHealth: async (): Promise<{ status: string; ai_service: string }> => {
      const response = await fetch(`${API_BASE}/ai/health`);
      if (!response.ok) throw new Error('AI health check failed');
      return response.json();
    }
  };
// ============================================================================
// SECTION 1: CORE DATA TYPES
// ============================================================================

export interface Item {
  id: string;
  name: string;
  auto_detected_type?: string;
  year?: number;
  description?: string;
  confidence_score?: number;
  verification_status?: string;
}

export interface Creator {
  id: string;
  name: string;
  type: string;
}

export interface InfluenceRelation {
  from_item: Item;
  to_item: Item;
  confidence: number;
  influence_type: string;
  explanation: string;
  category: string;
  scope?: string;
  source?: string;
  clusters?: string[];
}

export interface GraphResponse {
  main_item: Item;
  influences: InfluenceRelation[];
  categories: string[];
  creators: Creator[];
}

// ============================================================================
// SECTION 2: STRUCTURED DATA TYPES
// ============================================================================

export interface StructuredInfluence {
  name: string;
  type?: string;
  creator_name?: string;
  creator_type?: string;
  year?: number;
  category: string;
  scope: string;
  influence_type: string;
  confidence: number;
  explanation: string;
  source?: string;
  clusters?: string[];
}

export interface StructuredOutput {
  main_item: string;
  main_item_type?: string;
  main_item_creator?: string;
  main_item_creator_type?: string;
  main_item_year?: number;
  main_item_description?: string;
  influences: StructuredInfluence[];
  categories: string[];
}

export interface StructureRequest {
  influences_text: string;
  main_item: string;
  main_item_creator?: string;
}

// ============================================================================
// SECTION 3: GRAPH EXPANSION TYPES
// ============================================================================

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
    clusters?: string[];
  }>;
  center_item_id: string;
}

// ============================================================================
// SECTION 4: AI PROPOSAL TYPES
// ============================================================================

export interface InfluenceProposal {
  name: string;
  type?: string;
  creator_name?: string;
  creator_type?: string;
  year?: number;
  category: string;
  scope: string;
  influence_type: string;
  confidence: number;
  explanation: string;
  source?: string;
  accepted: boolean;
  parent_id?: string;
  children: InfluenceProposal[];
  is_expanded: boolean;
  clusters?: string[];
}

export interface ProposalResponse {
  item_name: string;
  item_type?: string;
  creator?: string;
  item_description?: string;
  item_year?: number;
  macro_influences: InfluenceProposal[];
  micro_influences: InfluenceProposal[];
  nano_influences: InfluenceProposal[];
  all_categories: string[];
  total_proposals: number;
  success: boolean;
  error_message?: string;
  all_clusters?: string[];
}

export interface AcceptProposalsRequest {
  item_name: string;
  item_type?: string;
  creator?: string;
  item_year?: number;
  item_description?: string;
  accepted_proposals: InfluenceProposal[];
}

export interface AcceptProposalsResponse {
  success: boolean;
  item_id?: string;
  accepted_count?: number;
  message?: string;
  requires_review?: boolean;
  similar_items?: any[];
  conflicts?: {
    main_item_conflicts: any[];
    influence_conflicts: Record<string, any>;
    total_conflicts: number;
  };
  preview_data?: {
    main_item_preview: any;
    influence_previews: Record<string, any>;
    merge_strategy: string;
  };
  new_data?: StructuredOutput;
}

// ============================================================================
// SECTION 5: QUESTION & ANSWER TYPES
// ============================================================================

export interface UnifiedQuestionRequest {
  item_name: string;
  item_type?: string;
  creator?: string;
  item_year?: number;
  item_description?: string;
  question: string;
  target_influence_name?: string;
  target_influence_explanation?: string;
}

export interface UnifiedQuestionResponse {
  item_name: string;
  question: string;
  question_type: string;
  target_influence_name?: string;
  new_influences: InfluenceProposal[];
  answer_explanation: string;
  success: boolean;
  error_message?: string;
}

// ============================================================================
// SECTION 6: ENHANCEMENT TYPES
// ============================================================================

export interface EnhancedContent {
  id: string;
  item_id: string;
  content_type: string;
  source: string;
  title: string;
  url: string;
  thumbnail?: string;
  relevance_score: number;
  context_explanation: string;
  embedded_data: Record<string, any>;
  created_at: string;
}

export interface EnhancementRequest {
  item_id: string;
  model_name?: string;
  max_content_pieces?: number;
}

export interface EnhancementResponse {
  item_id: string;
  analysis: Record<string, any>;
  enhanced_content: EnhancedContent[];
  enhancement_summary: string;
  error?: string;
}

export interface EnhancementStatus {
  status: string;
  progress: number;
  message: string;
  result?: EnhancementResponse;
}

// ============================================================================
// SECTION 7: CONFIGURATION
// ============================================================================

const API_BASE = 'http://localhost:8001/api';

// ============================================================================
// SECTION 8: CORE API OPERATIONS
// ============================================================================

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

  checkAIHealth: async (): Promise<{ status: string; ai_service: string }> => {
    const response = await fetch(`${API_BASE}/ai/health`);
    if (!response.ok) throw new Error('AI health check failed');
    return response.json();
  },

  deleteItem: async (itemId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete item');
    return response.json();
  },
  
  updateItem: async (itemId: string, updateData: {
    name?: string;
    description?: string;
    year?: number;
    auto_detected_type?: string;
    confidence_score?: number;
    verification_status?: string;
  }): Promise<{ success: boolean; item: Item; message: string }> => {
    const response = await fetch(`${API_BASE}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    if (!response.ok) throw new Error('Failed to update item');
    return response.json();
  },
  
  getMergeCandidates: async (itemId: string): Promise<{ candidates: any[] }> => {
    const response = await fetch(`${API_BASE}/items/${itemId}/merge-candidates`);
    if (!response.ok) throw new Error('Failed to get merge candidates');
    return response.json();
  },
  
  mergeItems: async (sourceId: string, targetId: string): Promise<{ success: boolean; target_item_id: string; message: string }> => {
    const response = await fetch(`${API_BASE}/items/${sourceId}/merge-into/${targetId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to merge items');
    return response.json();
  },
};

// ============================================================================
// SECTION 9: INFLUENCE SAVING OPERATIONS 
// ============================================================================

export const influenceApi = {
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

  mergeWithComprehensiveResolutions: async (
    existingItemId: string, 
    newData: StructuredOutput, 
    influenceResolutions: Record<string, any>
  ): Promise<{ success: boolean; item_id: string; message: string }> => {
    const response = await fetch(`${API_BASE}/influences/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        existing_item_id: existingItemId,
        new_data: newData,
        influence_resolutions: influenceResolutions
      }),
    });
    if (!response.ok) throw new Error('Failed to merge with comprehensive resolutions');
    return response.json();
  },
};

// ============================================================================
// SECTION 10: AI PROPOSAL OPERATIONS
// ============================================================================

export const proposalApi = {
  generateProposals: async (request: { item_name: string; creator?: string; item_type?: string }): Promise<ProposalResponse> => {
    const response = await fetch(`${API_BASE}/ai/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to generate proposals');
    return response.json();
  },

  acceptProposals: async (request: AcceptProposalsRequest): Promise<AcceptProposalsResponse> => {
    const response = await fetch(`${API_BASE}/ai/proposals/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to accept proposals');
    return response.json();
  },

  askQuestion: async (request: UnifiedQuestionRequest): Promise<UnifiedQuestionResponse> => {
    const response = await fetch(`${API_BASE}/ai/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to process question');
    return response.json();
  },
};

// ============================================================================
// SECTION 11: CANVAS API OPERATIONS
// ============================================================================

export const canvasApi = {
  generateResearch: async (request: {
    item_name: string;
    creator?: string;
    item_type?: string;
    scope?: string;
    selected_model?: string;
    use_two_agent?: boolean;
  }): Promise<{
    success: boolean;
    document?: any;
    response_text?: string;
    error_message?: string;
    active_model?: string;
    active_model_display?: string;
  }> => {
    const response = await fetch(`${API_BASE}/canvas/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to generate research');
    return response.json();
  },

  sendChatMessage: async (request: {
    message: string;
    current_document: any;
    context?: Record<string, any>;
    selected_model?: string;
  }): Promise<{
    success: boolean;
    response_text: string;
    new_sections?: any[];
    updated_sections?: any[];
    insert_after?: string;
    error_message?: string;
    active_model?: string;
    active_model_display?: string;
  }> => {
    console.log('=== CANVAS API CHAT DEBUG ===');
    console.log('Request:', { message: request.message, document_id: request.current_document?.id });
    
    try {
      const response = await fetch(`${API_BASE}/canvas/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response Data:', data);
      return data;
      
    } catch (error) {
      console.error('Canvas Chat API Error:', error);
      throw error;
    }
  },

  refineSection: async (request: {
    section_id: string;
    prompt: string;
    document: any;
    selected_model?: string;
  }): Promise<{
    success: boolean;
    refined_section: any;
    active_model?: string;
    active_model_display?: string;
  }> => {
    const response = await fetch(`${API_BASE}/canvas/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to refine section');
    return response.json();
  },
};

// ============================================================================
// SECTION 12: ENHANCEMENT API OPERATIONS
// ============================================================================

export const enhancementApi = {
  enhanceItem: async (request: EnhancementRequest): Promise<EnhancementResponse> => {
    const response = await fetch(`${API_BASE}/enhancement/items/${request.item_id}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error('Failed to enhance item');
    return response.json();
  },

  getEnhancedContent: async (itemId: string): Promise<EnhancedContent[]> => {
    const response = await fetch(`${API_BASE}/enhancement/items/${itemId}/enhanced-content`);
    if (!response.ok) throw new Error('Failed to get enhanced content');
    return response.json();
  },

  deleteEnhancedContent: async (contentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE}/enhancement/content/${contentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete enhanced content');
    return response.json();
  },

  deleteAllEnhancedContent: async (itemId: string): Promise<{ success: boolean; deleted_count: number; message: string }> => {
    const response = await fetch(`${API_BASE}/enhancement/items/${itemId}/enhanced-content`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete all enhanced content');
    return response.json();
  },
};
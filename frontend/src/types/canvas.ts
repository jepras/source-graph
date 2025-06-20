export interface CanvasDocument {
    id: string;
    item_name: string;
    item_type?: string;
    item_year?: number;  
    creator?: string;
    sections: DocumentSection[];
    created_at: Date;
  }
  
  export interface DocumentSection {
    id: string;
    type: 'intro' | 'influence-category' | 'influence-item';
    title?: string;
    content: string;
    influence_data?: {
      name: string;
      type?: string;           // ADD this
      creator_name?: string;   // ADD this  
      creator_type?: string;   // ADD this
      year?: number;           // ADD this
      category: string;
      scope: 'macro' | 'micro' | 'nano';
      influence_type?: string; // ADD this
      confidence: number;
      explanation: string;
      clusters?: string[];     // ADD this
    };
    selectedForGraph: boolean;
    isEditing?: boolean;
    metadata?: {
      createdAt: Date;
      lastEdited?: Date;
      aiGenerated: boolean;
    };
  }
  
  export interface CanvasState {
    currentDocument: CanvasDocument | null;
    loading: boolean;
    error: string | null;
    chatHistory: ChatMessage[];
    sectionLoadingStates: Record<string, boolean>;
    selectedModel: string;  // User-selected model: 'perplexity', 'gemini', 'openai'
    activeModel: string;    // Currently active model (may differ due to fallback)
    use_two_agent: boolean; // Use two-agent system instead of single-agent
    loading_stage: 'analyzing' | 'structuring' | null; // Two-agent loading stages
  }
  
  export interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  }
  
  // API Request/Response types
  export interface CanvasResearchRequest {
    item_name: string;
    creator?: string;
    item_type?: string;
    scope?: 'highlights' | 'comprehensive';
    selected_model?: string;  // 'perplexity', 'gemini', 'openai', or 'default'
    use_two_agent?: boolean;  // Use two-agent system instead of single-agent
  }
  
  export interface CanvasResearchResponse {
    success: boolean;
    document: CanvasDocument;
    error_message?: string;
    active_model?: string;  // Model key that was actually used
    active_model_display?: string;  // Display name of the model used
  }
  
  export interface CanvasChatRequest {
    message: string;
    current_document: CanvasDocument;
    context?: Record<string, any>;
    selected_model?: string;  // 'perplexity', 'gemini', 'openai', or 'default'
    use_two_agent?: boolean;  // Use two-agent system instead of single-agent
  }
  
  export interface CanvasChatResponse {
    success: boolean;
    response_text: string;
    new_sections?: DocumentSection[];
    updated_sections?: DocumentSection[];
    insert_after?: string;
    error_message?: string;
    active_model?: string;  // Model key that was actually used
    active_model_display?: string;  // Display name of the model used
  }
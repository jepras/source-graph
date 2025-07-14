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
    selectedForGraph: boolean;  // Default is now true in backend
    isEditing?: boolean;
    metadata?: {
      createdAt: Date;
      lastEdited?: Date;
      aiGenerated: boolean;
    };
  }
  
  export interface ActivityLogEntry {
    id: string;
    timestamp: Date;
    stage: 'setup' | 'analyzing' | 'structuring' | 'parsing' | 'complete' | 'error';
    activity: string;
    function_called?: string;
    parameters?: Record<string, any>;
    duration_ms?: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }
  
  // Streaming types
export interface StreamingChunk {
  type: 'content' | 'progress' | 'stage' | 'complete' | 'error';
  data: string;
  stage?: string;
  progress?: number;
  error?: string;
}

export interface CanvasState {
  currentDocument: CanvasDocument | null;
  loading: boolean;
  error: string | null;
  chatHistory: ChatMessage[];
  sectionLoadingStates: Record<string, boolean>;
  selectedModel: string;  // User-selected model: 'perplexity', 'perplexity-sonar-reasoning', 'gemini-2.5-flash', 'gemini-2.5-pro', 'openai'
  activeModel: string;    // Currently active model (may differ due to fallback)
  use_two_agent: boolean; // Use two-agent system instead of single-agent (defaults to true)
  loading_stage: 'analyzing' | 'structuring' | null; // Two-agent loading stages
  activityLogs: ActivityLogEntry[]; // Research activity logs
  // Streaming state
  streamingActive: boolean; // Whether streaming is currently active
  streamingOutput: string[]; // Array of streaming chunks received
  streamingStage: string | null; // Current streaming stage (e.g., 'analyzing', 'structuring')
  streamingProgress: number; // Progress percentage (0-100)
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
    selected_model?: string;  // 'perplexity', 'perplexity-sonar-reasoning', 'gemini-2.5-flash', 'gemini-2.5-pro', 'openai', or 'default'
    use_two_agent?: boolean;  // Use two-agent system instead of single-agent (defaults to true)
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
    selected_model?: string;  // 'perplexity', 'perplexity-sonar-reasoning', 'gemini-2.5-flash', 'gemini-2.5-pro', 'openai', or 'default'
    use_two_agent?: boolean;  // Use two-agent system instead of single-agent (defaults to true)
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
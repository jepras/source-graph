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
  }
  
  export interface CanvasResearchResponse {
    success: boolean;
    document: CanvasDocument;
    error_message?: string;
  }
  
  export interface CanvasChatRequest {
    message: string;
    current_document: CanvasDocument;
    context?: Record<string, any>;
  }
  
  export interface CanvasChatResponse {
    success: boolean;
    response_text: string;
    new_sections?: DocumentSection[];
    updated_sections?: DocumentSection[];
    insert_after?: string;
    error_message?: string;
  }
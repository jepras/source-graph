export interface GraphNode {
    id: string;
    name: string;
    type: string;
    year?: number;
    x?: number;
    y?: number;
    category: 'main' | 'influence';
    isSelected?: boolean;
    clusters?: string[]; // NEW: Add this line
  }
  
  export interface GraphLink {
    source: string;
    target: string;
    confidence: number;
    influence_type: string;
    explanation: string;
    category: string;
  }
  
  export interface AccumulatedGraph {
    nodes: Map<string, GraphNode>;
    relationships: Map<string, GraphLink>;
    selectedNodeId: string | null;
    expandedNodeIds: Set<string>;
  }
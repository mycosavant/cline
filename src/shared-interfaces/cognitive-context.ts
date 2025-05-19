/**
 * Cognitive Context Interface
 * 
 * Defines the contract between roo-code and coding-memory for cognitive capabilities
 */

/**
 * Neural-symbolic representation of code elements
 */
export interface NeuralSymbolicRepresentation {
  id: string;
  elementType: 'function' | 'class' | 'variable' | 'module' | 'statement' | 'expression' | 'other';
  elementId: string;
  symbolName: string;
  embedding: number[];
  semanticProperties: Record<string, any>;
  relatedConcepts: Array<{
    concept: string;
    strength: number;
  }>;
  metadata: Record<string, any>;
}

/**
 * Cognitive insight about code
 */
export interface CognitiveInsight {
  id: string;
  type: 'pattern' | 'suggestion' | 'explanation' | 'relation' | 'prediction';
  confidence: number;
  content: string;
  relatedElements: string[];
  metadata: Record<string, any>;
}

/**
 * Hierarchical memory structure
 */
export interface HierarchicalMemory {
  id: string;
  structure: {
    nodes: Array<{
      id: string;
      type: string;
      name: string;
      properties: Record<string, any>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      properties: Record<string, any>;
    }>;
  };
  metadata: Record<string, any>;
}

/**
 * Cursor position in a document
 */
export interface CursorPosition {
  line: number;
  character: number;
}

/**
 * Cognitive Context Interface
 */
export interface ICognitiveContext {
  /**
   * Gets neural-symbolic representations for a file or specific element
   * @param filePath Path to the file
   * @param elementId Optional ID of a specific element
   * @returns Array of neural-symbolic representations
   */
  getNeuralSymbolicRepresentations(filePath: string, elementId?: string): Promise<NeuralSymbolicRepresentation[]>;

  /**
   * Gets cognitive insights for a file at a specific cursor position
   * @param filePath Path to the file
   * @param content Content of the file
   * @param cursorPosition Position of the cursor
   * @returns Cognitive insights
   */
  getCognitiveInsights(filePath: string, content: string, cursorPosition: CursorPosition): Promise<{
    insights: CognitiveInsight[];
    metadata: Record<string, any>;
  }>;

  /**
   * Gets hierarchical memory for a file
   * @param filePath Path to the file
   * @param maxDepth Maximum depth of the hierarchy
   * @returns Hierarchical memory
   */
  getHierarchicalMemory(filePath: string, maxDepth?: number): Promise<HierarchicalMemory>;
}
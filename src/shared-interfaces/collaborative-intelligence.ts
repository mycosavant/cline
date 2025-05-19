/**
 * Collaborative Intelligence Interface
 * 
 * Defines the contract between roo-code and coding-memory for collaborative intelligence capabilities
 */

/**
 * Developer intention model
 */
export interface DeveloperIntention {
  id: string;
  type: 'refactor' | 'implement' | 'fix' | 'explore' | 'understand' | 'other';
  confidence: number;
  description: string;
  relatedEntities: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
}

/**
 * Context for developer intentions
 */
export interface DeveloperContext {
  currentFile?: string;
  openFiles?: string[];
  recentEdits?: Array<{
    file: string;
    timestamp: Date;
    changes: string;
  }>;
  searchHistory?: string[];
  navigationHistory?: Array<{
    file: string;
    timestamp: Date;
  }>;
  codeSelection?: {
    file: string;
    startLine: number;
    endLine: number;
    content: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Shared mental model
 */
export interface SharedMentalModel {
  id: string;
  projectUnderstanding: {
    coreComponents: Array<{
      name: string;
      purpose: string;
      importance: number;
    }>;
    dependencies: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }>;
    conceptualMap: Record<string, any>;
  };
  developmentGoals: Array<{
    id: string;
    description: string;
    priority: number;
    status: 'planned' | 'in-progress' | 'completed';
  }>;
  knowledgeGaps: Array<{
    area: string;
    description: string;
    impact: number;
  }>;
  metadata: Record<string, any>;
}

/**
 * Problem description
 */
export interface Problem {
  description: string;
  context?: Record<string, any>;
  constraints?: string[];
  expectedOutcome?: string;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Solution proposal
 */
export interface Solution {
  id: string;
  description: string;
  steps: Array<{
    description: string;
    reasoning: string;
    code?: string;
  }>;
  alternatives: Array<{
    description: string;
    tradeoffs: string[];
  }>;
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Collaborative Intelligence Interface
 */
export interface ICollaborativeIntelligence {
  /**
   * Infers developer intentions from context
   * @param context Developer context
   * @returns Inferred intentions
   */
  inferDeveloperIntentions(context: DeveloperContext): Promise<{
    intentions: DeveloperIntention[];
    metadata: Record<string, any>;
  }>;

  /**
   * Creates a shared mental model from context
   * @param context Developer context
   * @returns Shared mental model
   */
  createSharedMentalModel(context: DeveloperContext): Promise<SharedMentalModel>;

  /**
   * Engages in collaborative problem solving
   * @param problem Problem to solve
   * @returns Solution proposal
   */
  engageCollaborativeProblemSolving(problem: Problem): Promise<Solution>;
}
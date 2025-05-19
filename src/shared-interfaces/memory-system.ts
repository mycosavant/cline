/**
 * Memory System Interface
 * 
 * Defines the contract between roo-code and coding-memory for memory operations
 */

/**
 * Entity interface representing a stored item in the memory system
 */
export interface Entity {
  id: string;
  type: string;
  content: any;
  metadata: Record<string, any>;
  relations?: Relation[];
}

/**
 * Relation interface representing a connection between entities
 */
export interface Relation {
  sourceId: string;
  targetId: string;
  type: string;
  strength: number;
  metadata?: Record<string, any>;
}

/**
 * Options for relation queries
 */
export interface RelationOptions {
  types?: string[];
  minStrength?: number;
  maxResults?: number;
  includeMetadata?: boolean;
}

/**
 * Entity graph structure
 */
export interface EntityGraph {
  entities: Entity[];
  relations: Relation[];
  metadata: {
    rootEntityId: string;
    depth: number;
    timestamp: Date;
  };
}

/**
 * Memory System Interface
 */
export interface IMemorySystem {
  /**
   * Stores an entity in the memory system
   * @param entity Entity to store
   * @returns ID of the stored entity
   */
  storeEntity(entity: Entity): Promise<string>;

  /**
   * Retrieves an entity from the memory system
   * @param id ID of the entity to retrieve
   * @returns The entity or null if not found
   */
  retrieveEntity(id: string): Promise<Entity | null>;

  /**
   * Finds entities related to the specified entity
   * @param entityId ID of the entity to find relations for
   * @param options Query options
   * @returns Array of related entities
   */
  findRelatedEntities(entityId: string, options?: RelationOptions): Promise<Entity[]>;

  /**
   * Gets the entity graph for a file
   * @param filePath Path to the file
   * @param maxDepth Maximum depth of the graph
   * @returns Entity graph
   */
  getEntityGraph(filePath: string, maxDepth?: number): Promise<EntityGraph>;
}
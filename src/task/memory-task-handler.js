export class MemoryTaskHandler {
    mcpManager;
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
    }
    async handleMemoryOperation(task, params) {
        try {
            // Get the memory adapter
            const memoryAdapter = this.mcpManager.getAdapter('contextual-memory');
            if (!memoryAdapter) {
                throw new Error('Contextual Memory adapter not found');
            }
            // Get the MCP adapter
            const mcpAdapter = memoryAdapter;
            // Find the appropriate action based on the operation
            let result;
            switch (params.operation) {
                case 'getContext':
                    // Find the action for context retrieval
                    const contextAction = mcpAdapter.actions.find(action => action.name === 'getContext' || action.name === 'retrieveContext');
                    if (!contextAction) {
                        throw new Error('Context retrieval action not found in MCP adapter');
                    }
                    result = await contextAction.implementation({
                        filePath: params.filePath,
                        includeContent: params.includeContent
                    });
                    break;
                case 'findRelatedEntities':
                    // Find the action for finding related entities
                    const relatedEntitiesAction = mcpAdapter.actions.find(action => action.name === 'findRelatedEntities');
                    if (!relatedEntitiesAction) {
                        throw new Error('Find related entities action not found in MCP adapter');
                    }
                    result = await relatedEntitiesAction.implementation({
                        entityId: params.entityId,
                        relationshipTypes: params.relationshipTypes,
                        maxResults: params.maxResults
                    });
                    break;
                case 'defineRelationship':
                    // Find the action for defining relationships
                    const defineRelationshipAction = mcpAdapter.actions.find(action => action.name === 'defineRelationship');
                    if (!defineRelationshipAction) {
                        throw new Error('Define relationship action not found in MCP adapter');
                    }
                    result = await defineRelationshipAction.implementation({
                        sourceEntityId: params.sourceEntityId,
                        targetEntityId: params.targetEntityId,
                        relationshipType: params.relationshipType,
                        strength: params.strength,
                        metadata: params.metadata
                    });
                    break;
                case 'getEntityGraph':
                    // Find the action for getting entity graph
                    const entityGraphAction = mcpAdapter.actions.find(action => action.name === 'getEntityGraph');
                    if (!entityGraphAction) {
                        throw new Error('Get entity graph action not found in MCP adapter');
                    }
                    result = await entityGraphAction.implementation({
                        entity: params.entity,
                        entityType: params.entityType,
                        filePath: params.filePath,
                        maxDepth: params.maxDepth,
                        minStrength: params.minStrength,
                        relationshipTypes: params.relationshipTypes
                    });
                    break;
                default:
                    throw new Error(`Unsupported memory operation: ${params.operation}`);
            }
            return result;
        }
        catch (error) {
            console.error('Memory operation error:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=memory-task-handler.js.map
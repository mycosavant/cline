/**
 * Coding Memory Adapter
 *
 * Implements the adapter pattern to connect roo-code with coding-memory
 */
import { features } from '../config/features';
/**
 * Coding Memory Adapter implementing all interfaces
 */
export class CodingMemoryAdapter {
    memorySystem;
    cognitiveContext;
    toolEvolution;
    collaborativeIntelligence;
    /**
     * Creates a new Coding Memory Adapter
     * @param options Adapter options
     */
    constructor(options) {
        this.memorySystem = options.memorySystem;
        this.cognitiveContext = options.cognitiveContext;
        this.toolEvolution = options.toolEvolution;
        this.collaborativeIntelligence = options.collaborativeIntelligence;
    }
    // IMemorySystem implementation
    /**
     * @inheritdoc
     */
    async storeEntity(entity) {
        return this.memorySystem.storeEntity(entity);
    }
    /**
     * @inheritdoc
     */
    async retrieveEntity(id) {
        return this.memorySystem.retrieveEntity(id);
    }
    /**
     * @inheritdoc
     */
    async findRelatedEntities(entityId, options) {
        return this.memorySystem.findRelatedEntities(entityId, options);
    }
    /**
     * @inheritdoc
     */
    async getEntityGraph(filePath, maxDepth) {
        return this.memorySystem.getEntityGraph(filePath, maxDepth);
    }
    // ICognitiveContext implementation
    /**
     * @inheritdoc
     */
    async getNeuralSymbolicRepresentations(filePath, elementId) {
        if (!features.enableCognitiveCapabilities || !this.cognitiveContext) {
            return [];
        }
        return this.cognitiveContext.getNeuralSymbolicRepresentations(filePath, elementId);
    }
    /**
     * @inheritdoc
     */
    async getCognitiveInsights(filePath, content, cursorPosition) {
        if (!features.enableCognitiveCapabilities || !this.cognitiveContext) {
            return { insights: [], metadata: {} };
        }
        return this.cognitiveContext.getCognitiveInsights(filePath, content, cursorPosition);
    }
    /**
     * @inheritdoc
     */
    async getHierarchicalMemory(filePath, maxDepth) {
        if (!features.enableCognitiveCapabilities || !this.cognitiveContext) {
            return {
                id: 'empty',
                structure: {
                    nodes: [],
                    edges: []
                },
                metadata: {}
            };
        }
        return this.cognitiveContext.getHierarchicalMemory(filePath, maxDepth);
    }
    // IToolEvolution implementation
    /**
     * @inheritdoc
     */
    async synthesizeTool(requirements) {
        if (!features.enableToolEvolution || !this.toolEvolution) {
            throw new Error('Tool evolution is not enabled');
        }
        return this.toolEvolution.synthesizeTool(requirements);
    }
    /**
     * @inheritdoc
     */
    async adaptTool(toolId, adaptations) {
        if (!features.enableToolEvolution || !this.toolEvolution) {
            throw new Error('Tool evolution is not enabled');
        }
        return this.toolEvolution.adaptTool(toolId, adaptations);
    }
    /**
     * @inheritdoc
     */
    async composeToolChain(tasks) {
        if (!features.enableToolEvolution || !this.toolEvolution) {
            throw new Error('Tool evolution is not enabled');
        }
        return this.toolEvolution.composeToolChain(tasks);
    }
    // ICollaborativeIntelligence implementation
    /**
     * @inheritdoc
     */
    async inferDeveloperIntentions(context) {
        if (!features.enableCollaborativeIntelligence || !this.collaborativeIntelligence) {
            return { intentions: [], metadata: {} };
        }
        return this.collaborativeIntelligence.inferDeveloperIntentions(context);
    }
    /**
     * @inheritdoc
     */
    async createSharedMentalModel(context) {
        if (!features.enableCollaborativeIntelligence || !this.collaborativeIntelligence) {
            throw new Error('Collaborative intelligence is not enabled');
        }
        return this.collaborativeIntelligence.createSharedMentalModel(context);
    }
    /**
     * @inheritdoc
     */
    async engageCollaborativeProblemSolving(problem) {
        if (!features.enableCollaborativeIntelligence || !this.collaborativeIntelligence) {
            throw new Error('Collaborative intelligence is not enabled');
        }
        return this.collaborativeIntelligence.engageCollaborativeProblemSolving(problem);
    }
}
//# sourceMappingURL=coding-memory-adapter.js.map
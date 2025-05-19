import { Logger } from '../services/logging/Logger';
export class ContextBuilder {
    mcpManager;
    constructor(mcpManager) {
        this.mcpManager = mcpManager;
    }
    async buildContext(editor) {
        const context = await this.buildBaseContext(editor);
        // Enrich with memory context if available
        await this.enrichWithMemoryContext(context, editor);
        return context;
    }
    async buildBaseContext(editor) {
        const document = editor.document;
        const selection = editor.selection;
        return {
            filePath: document.uri.fsPath,
            content: document.getText(),
            language: document.languageId,
            selection: {
                start: document.offsetAt(selection.start),
                end: document.offsetAt(selection.end)
            }
        };
    }
    async enrichWithMemoryContext(context, editor) {
        try {
            const memoryAdapter = this.mcpManager.getAdapter('contextual-memory');
            if (!memoryAdapter) {
                return;
            }
            const filePath = editor.document.uri.fsPath;
            // Find the action for context retrieval
            const contextAction = memoryAdapter.actions.find(action => action.name === 'getContext' || action.name === 'retrieveContext');
            if (!contextAction) {
                Logger.log('Context retrieval action not found in MCP adapter');
                return;
            }
            // Get context from memory
            const memoryContext = await contextAction.implementation({
                filePath,
                includeContent: false
            });
            if (memoryContext.success) {
                // Add entities and relationships to context
                context.memoryContext = {
                    entities: memoryContext.context.entities,
                    relationships: memoryContext.context.relationships
                };
                // Find the action for getting related files
                const relatedFilesAction = memoryAdapter.actions.find(action => action.name === 'getRelatedFiles');
                if (relatedFilesAction) {
                    // Get related files
                    const relatedFilesResult = await relatedFilesAction.implementation({
                        filePath
                    });
                    if (relatedFilesResult.success) {
                        context.relatedFiles = relatedFilesResult.relatedFiles;
                    }
                }
            }
        }
        catch (error) {
            Logger.log('Failed to enrich context with memory information: ' + error.message);
        }
    }
}
//# sourceMappingURL=context-builder.js.map
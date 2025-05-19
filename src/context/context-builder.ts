// Using the vscode types defined in types.d.ts
import * as vscode from 'vscode';
import { MCPAdapterManager } from '../mcp_server/mcp-adapter-manager';
import { Logger } from '../services/logging/Logger';

// Basic Context interface
export interface Context {
  filePath?: string;
  content?: string;
  language?: string;
  selection?: {
    start: number;
    end: number;
  };
  memoryContext?: {
    entities?: any[];
    relationships?: any[];
  };
  relatedFiles?: string[];
}

export class ContextBuilder {
  constructor(
    private mcpManager: MCPAdapterManager,
    // other dependencies
  ) {}
  
  async buildContext(editor: vscode.TextEditor): Promise<Context> {
    const context = await this.buildBaseContext(editor);
    
    // Enrich with memory context if available
    await this.enrichWithMemoryContext(context, editor);
    
    return context;
  }
  
  private async buildBaseContext(editor: vscode.TextEditor): Promise<Context> {
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
  
  private async enrichWithMemoryContext(context: Context, editor: vscode.TextEditor): Promise<void> {
    try {
      const memoryAdapter = this.mcpManager.getAdapter('contextual-memory');
      if (!memoryAdapter) {
        return;
      }
      
      const filePath = editor.document.uri.fsPath;
      
      // Find the action for context retrieval
      const contextAction = memoryAdapter.actions.find(
        action => action.name === 'getContext' || action.name === 'retrieveContext'
      );
      
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
        const relatedFilesAction = memoryAdapter.actions.find(
          action => action.name === 'getRelatedFiles'
        );
        
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
    } catch (error: any) {
      Logger.log('Failed to enrich context with memory information: ' + error.message);
    }
  }
}
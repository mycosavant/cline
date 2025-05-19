// Using the vscode types defined in types.d.ts
import * as vscode from 'vscode';
import { MCPAdapterManager } from '../mcp_server/mcp-adapter-manager';
import { Logger } from '../services/logging/Logger';

export class RelationshipGraphPanel {
  private static currentPanel: RelationshipGraphPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  
  private constructor(
    panel: vscode.WebviewPanel,
    private mcpManager: MCPAdapterManager
  ) {
    this.panel = panel;
    
    // Set initial content
    this.update();
    
    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }
  
  public static create(mcpManager: MCPAdapterManager): RelationshipGraphPanel {
    const panel = vscode.window.createWebviewPanel(
      'relationshipGraph',
      'Code Relationship Graph',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    RelationshipGraphPanel.currentPanel = new RelationshipGraphPanel(panel, mcpManager);
    return RelationshipGraphPanel.currentPanel;
  }
  
  private async update(): Promise<void> {
    const memoryAdapter = this.mcpManager.getAdapter('contextual-memory');
    if (!memoryAdapter) {
      this.panel.webview.html = this.getErrorHtml('Contextual Memory not available');
      return;
    }
    
    try {
      // Get active file
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        this.panel.webview.html = this.getInstructionsHtml();
        return;
      }
      
      const filePath = editor.document.uri.fsPath;
      
      // Find the action for getting entity graph
      const entityGraphAction = memoryAdapter.actions.find(
        action => action.name === 'getEntityGraph'
      );
      
      if (!entityGraphAction) {
        this.panel.webview.html = this.getErrorHtml('Entity graph action not found in MCP adapter');
        return;
      }
      
      // Get entity graph
      const graphResult = await entityGraphAction.implementation({
        filePath,
        maxDepth: 2
      });
      
      if (graphResult.success) {
        this.panel.webview.html = this.getMermaidHtml(graphResult.graph.mermaid);
      } else {
        this.panel.webview.html = this.getErrorHtml(graphResult.error || 'Failed to generate graph');
      }
    } catch (error: any) {
      Logger.log('Error generating entity graph: ' + error.message);
      this.panel.webview.html = this.getErrorHtml(`Error: ${error.message}`);
    }
  }
  
  private getMermaidHtml(mermaidDefinition: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <script>
          mermaid.initialize({startOnLoad: true, theme: 'dark'});
        </script>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .mermaid { text-align: center; }
        </style>
      </head>
      <body>
        <h1>Code Relationship Graph</h1>
        <div class="mermaid">
          ${mermaidDefinition}
        </div>
      </body>
      </html>
    `;
  }
  
  private getInstructionsHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 20px; }
        </style>
      </head>
      <body>
        <h1>Code Relationship Graph</h1>
        <p>Open a file to view its relationship graph.</p>
      </body>
      </html>
    `;
  }
  
  private getErrorHtml(error: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p class="error">${error}</p>
      </body>
      </html>
    `;
  }
  
  public refresh(): void {
    this.update();
  }
  
  private dispose(): void {
    RelationshipGraphPanel.currentPanel = undefined;
    
    // Clean up resources
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
import { KlausMcpHub } from './mcp'; // Import from the mcp file in the same directory

export class MCPAdapterManager {
  private adapters: Map<string, KlausMcpHub> = new Map();

  /**
   * Register a new MCP adapter.
   * @param adapter The MCP adapter to register.
   */
  registerAdapter(adapter: KlausMcpHub): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get an MCP adapter by name.
   * @param name The name of the adapter.
   * @returns The adapter if found, otherwise undefined.
   */
  getAdapter(name: string): KlausMcpHub | undefined {
    return this.adapters.get(name);
  }

  /**
   * List all registered adapters.
   * @returns An array of adapter names.
   */
  listAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}
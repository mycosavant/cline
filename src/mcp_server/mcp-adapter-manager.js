export class MCPAdapterManager {
    adapters = new Map();
    /**
     * Register a new MCP adapter.
     * @param adapter The MCP adapter to register.
     */
    registerAdapter(adapter) {
        this.adapters.set(adapter.name, adapter);
    }
    /**
     * Get an MCP adapter by name.
     * @param name The name of the adapter.
     * @returns The adapter if found, otherwise undefined.
     */
    getAdapter(name) {
        return this.adapters.get(name);
    }
    /**
     * List all registered adapters.
     * @returns An array of adapter names.
     */
    listAdapters() {
        return Array.from(this.adapters.keys());
    }
}
//# sourceMappingURL=mcp-adapter-manager.js.map
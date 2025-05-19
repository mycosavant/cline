export class McpHub {
    connections = [];
    isConnecting = false;
    constructor() {
        this.toggleToolAlwaysAllow = jest.fn();
        this.callTool = jest.fn();
    }
    async toggleToolAlwaysAllow(_serverName, _toolName, _shouldAllow) {
        return Promise.resolve();
    }
    async callTool(_serverName, _toolName, _toolArguments) {
        return Promise.resolve({ result: "success" });
    }
}
//# sourceMappingURL=McpHub.js.map
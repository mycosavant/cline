class McpServerRegistry {
    servers = [];
    addServer(server) {
        this.servers.push(server);
    }
    getServerByName(serverName) {
        return this.servers.find((server) => server.name === serverName);
    }
    getActionByName(serverName, actionName) {
        const server = this.getServerByName(serverName);
        if (server) {
            return server.actions.find((action) => action.name === actionName);
        }
        return undefined;
    }
}
export default McpServerRegistry;
//# sourceMappingURL=registry.js.map
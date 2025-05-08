import { McpServer, McpAction } from './mcp'; 

class McpServerRegistry {
  private servers: McpServer[] = [];

  addServer(server: McpServer): void {
    this.servers.push(server);
  }

  getServerByName(serverName: string): McpServer | undefined {
    return this.servers.find((server) => server.name === serverName);
  }

  getActionByName(serverName: string, actionName: string): McpAction | undefined {
    const server = this.getServerByName(serverName);
    if (server) {
      return server.actions.find((action) => action.name === actionName);
    }
    return undefined;
  }
}

export default McpServerRegistry;
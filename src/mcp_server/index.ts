import { KlausMcpHub, McpServer, McpAction, McpCall } from './mcp';

class TimeServer extends McpServer {
  constructor() {
    super('time_server', 'A server that provides the current time.',[]);
    this.actions = [
      new McpAction('get_time', 'Gets the current time.', this.getTime),
    ];
  }

  async getTime(call: McpCall): Promise<any> {
    return new Date().toISOString();
  }
}

export default TimeServer;
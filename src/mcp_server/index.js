import { McpServer, McpAction } from './mcp';
class TimeServer extends McpServer {
    constructor() {
        super('time_server', 'A server that provides the current time.', []);
        this.actions = [
            new McpAction('get_time', 'Gets the current time.', this.getTime),
        ];
    }
    async getTime(call) {
        return new Date().toISOString();
    }
}
export default TimeServer;
//# sourceMappingURL=index.js.map
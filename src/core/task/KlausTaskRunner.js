export class McpHub {
    name;
    description;
    servers = [];
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
    addServer(server) {
        this.servers.push(server);
    }
    async run(call) {
        const server = this.servers.find((server) => server.actions.some((action) => action.name === call.action_name));
        if (!server) {
            return `Server with action ${call.action_name} not found`;
        }
        const action = server.actions.find((action) => action.name === call.action_name);
        if (!action) {
            return `Action ${call.action_name} not found`;
        }
        return await action.implementation(call.parameters);
    }
    getActions() {
        return this.servers.flatMap((server) => server.actions);
    }
    async runAll(calls) {
        return Promise.all(calls.map((call) => this.run(call)));
    }
}
export class McpRegistry {
    name;
    description;
    mcpHubs = [];
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }
    addHub(mcpHub) {
        this.mcpHubs.push(mcpHub);
    }
    getActions() {
        return this.mcpHubs.flatMap((hub) => hub.getActions());
    }
    async run(call) {
        const action = this.getActions().find((action) => action.name === call.action_name);
        if (!action) {
            return `Action ${call.action_name} not found`;
        }
        const hub = this.mcpHubs.find((hub) => hub.getActions().some((action) => action.name === call.action_name));
        if (!hub) {
            return `Hub not found for action ${call.action_name}`;
        }
        return await hub.run(call);
    }
    async runAll(calls) {
        return Promise.all(calls.map((call) => this.run(call)));
    }
    getHubActions(hubName) {
        return this.mcpHubs.find((hub) => hub.name === hubName)?.getActions();
    }
}
export class McpAction {
    name;
    description;
    implementation;
    constructor(name, description, implementation) {
        this.name = name;
        this.description = description;
        this.implementation = implementation;
    }
}
//# sourceMappingURL=KlausTaskRunner.js.map
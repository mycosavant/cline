class McpCall {
    action_name;
    parameters;
    constructor(action_name, parameters) {
        this.action_name = action_name;
        this.parameters = parameters;
    }
}
class McpAction {
    name;
    description;
    implementation;
    constructor(name, description, implementation) {
        this.name = name;
        this.description = description;
        this.implementation = implementation;
    }
}
class KlausMcpHub {
    name;
    description;
    actions;
    constructor(name, description, actions = []) {
        this.name = name;
        this.description = description;
        this.actions = actions;
    }
}
export { McpCall, McpAction, KlausMcpHub, };
//# sourceMappingURL=mcp.js.map
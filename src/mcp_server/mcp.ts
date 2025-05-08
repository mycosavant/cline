class McpCall {
  action_name: string;
  parameters: any;

  constructor(action_name: string, parameters: any) {
    this.action_name = action_name;
    this.parameters = parameters;
  }
}

class McpAction {
  name: string;
  description: string;
  implementation: (parameters: any) => Promise<any>;

  constructor(
    name: string,
    description: string,
    implementation: (parameters: any) => Promise<any>
  ) {
    this.name = name;
    this.description = description;
    this.implementation = implementation;
  }
}

class KlausMcpHub {
  name: string;
  description: string;
  actions: McpAction[];

  constructor(name: string, description: string, actions: McpAction[] = []) {
    this.name = name;
    this.description = description;
    this.actions = actions;
  }
}

export {
  McpCall,
  McpAction,
  KlausMcpHub,
};

import { McpCall, McpServer } from "./mcp";

export class McpHub {
  name: string;
  description: string;
  private servers: McpServer[] = [];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  addServer(server: McpServer) {
    this.servers.push(server);
  }

  async run(call: McpCall): Promise<any> {
    const server = this.servers.find((server) =>
      server.actions.some((action) => action.name === call.action_name)
    );
    if (!server) {
      return `Server with action ${call.action_name} not found`;
    }
    const action = server.actions.find(
      (action) => action.name === call.action_name
    );
    if (!action) {
      return `Action ${call.action_name} not found`;
    }
    return await action.implementation(call.parameters);
  }

  getActions(): McpAction[] {
    return this.servers.flatMap((server) => server.actions);
  }

  async runAll(calls: McpCall[]): Promise<any[]> {
    return Promise.all(calls.map((call) => this.run(call)));
  }
}

export class McpRegistry {
  name: string;
  description: string;
  private mcpHubs: McpHub[] = [];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  addHub(mcpHub: McpHub) {
    this.mcpHubs.push(mcpHub);
  }

  getActions(): McpAction[] {
    return this.mcpHubs.flatMap((hub) => hub.getActions());
  }

  async run(call: McpCall): Promise<any> {
    const action = this.getActions().find(
      (action) => action.name === call.action_name
    );
    if (!action) {
      return `Action ${call.action_name} not found`;
    }

    const hub = this.mcpHubs.find((hub) =>
      hub.getActions().some((action) => action.name === call.action_name)
    );

    if (!hub) {
      return `Hub not found for action ${call.action_name}`;
    }
    return await hub.run(call);
  }

  async runAll(calls: McpCall[]): Promise<any[]> {
    return Promise.all(calls.map((call) => this.run(call)));
  }

  getHubActions(hubName: string): McpAction[] | undefined {
    return this.mcpHubs.find((hub) => hub.name === hubName)?.getActions();
  }
}

export interface McpToolCallResponse {
  content:
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
    | {
        type: "resource";
        resource: {
          uri: string;
          mimeType?: string;
          text?: string;
          blob?: string;
        };
      }[];
  action: string;
  action_parameters: string;
  finish_reason: string;
}

export class McpAction {
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
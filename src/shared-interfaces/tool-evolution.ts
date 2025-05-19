/**
 * Tool Evolution Interface
 * 
 * Defines the contract between roo-code and coding-memory for tool evolution capabilities
 */

/**
 * Tool requirement specification
 */
export interface ToolRequirement {
  functionalityDescription: string;
  inputParameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  outputTypes: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  dependencies: string[];
  constraints?: string[];
  examples?: Array<{
    input: Record<string, any>;
    output: any;
    description: string;
  }>;
}

/**
 * Tool implementation
 */
export interface Tool {
  id: string;
  name: string;
  version: string;
  description: string;
  implementation: {
    code: string;
    language: string;
    entryPoint: string;
  };
  requirements: ToolRequirement;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    usageCount: number;
    successRate: number;
    tags: string[];
  };
}

/**
 * Tool adaptation specification
 */
export interface ToolAdaptation {
  adaptationType: 'enhance' | 'fix' | 'optimize' | 'extend';
  description: string;
  changes: Array<{
    type: 'modify' | 'add' | 'remove';
    target: string;
    content?: string;
  }>;
  requirements?: Partial<ToolRequirement>;
}

/**
 * Tool chain task
 */
export interface ToolChainTask {
  description: string;
  expectedInput: Record<string, any>;
  expectedOutput: Record<string, any>;
  constraints?: string[];
}

/**
 * Tool chain plan
 */
export interface ToolChainPlan {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    toolId: string;
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
  }>;
  metadata: {
    createdAt: Date;
    estimatedSuccessRate: number;
    estimatedExecutionTime: number;
  };
}

/**
 * Tool Evolution Interface
 */
export interface IToolEvolution {
  /**
   * Synthesizes a new tool based on requirements
   * @param requirements Tool requirements
   * @returns The synthesized tool
   */
  synthesizeTool(requirements: ToolRequirement): Promise<Tool>;

  /**
   * Adapts an existing tool
   * @param toolId ID of the tool to adapt
   * @param adaptations Adaptation specifications
   * @returns The adapted tool
   */
  adaptTool(toolId: string, adaptations: ToolAdaptation): Promise<Tool>;

  /**
   * Composes a tool chain for a set of tasks
   * @param tasks Tasks to compose a tool chain for
   * @returns Tool chain plan
   */
  composeToolChain(tasks: ToolChainTask[]): Promise<ToolChainPlan>;
}
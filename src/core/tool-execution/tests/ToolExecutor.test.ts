import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolExecutor } from '../ToolExecutor';
import { enhancedExecutionEngine } from '../enhanced-execution-engine';
import { ToolExecutionMode } from '../types';
import { executeSingleTool, executeToolsInParallel, executeToolsSequentially } from '../index';

// Mock the dependencies
vi.mock('../enhanced-execution-engine', () => ({
  enhancedExecutionEngine: {
    executeToolsSequentially: vi.fn().mockResolvedValue({
      results: new Map([['test-tool', { toolId: 'test-tool', success: true, result: 'Success' }]]),
      success: true
    }),
    executeToolsInParallel: vi.fn().mockResolvedValue({
      results: new Map([['test-tool', { toolId: 'test-tool', success: true, result: 'Success' }]]),
      success: true
    }),
    executeToolsConditionally: vi.fn().mockResolvedValue({
      results: new Map([['test-tool', { toolId: 'test-tool', success: true, result: 'Success' }]]),
      success: true
    }),
    executeJsonToolExecution: vi.fn().mockResolvedValue({
      results: new Map([['test-tool', { toolId: 'test-tool', success: true, result: 'Success' }]]),
      success: true
    })
  }
}));

vi.mock('../index', () => ({
  executeSingleTool: vi.fn().mockResolvedValue({ toolId: 'test-tool', success: true, result: 'Success' }),
  executeToolsInParallel: vi.fn().mockResolvedValue([{ toolId: 'test-tool', success: true, result: 'Success' }]),
  executeToolsSequentially: vi.fn().mockResolvedValue([{ toolId: 'test-tool', success: true, result: 'Success' }])
}));

// Mock formatResponse
vi.mock('../prompts/responses', () => ({
  formatResponse: {
    toolResult: vi.fn().mockImplementation((message) => message)
  }
}));

describe('ToolExecutor', () => {
  let toolExecutor: ToolExecutor;
  let mockTask: any;

  beforeEach(() => {
    mockTask = {
      taskId: 'test-task',
      instanceId: 'test-instance'
    };
    toolExecutor = new ToolExecutor(mockTask);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('executeTool', () => {
    it('should execute a single tool', async () => {
      const tool = {
        type: 'tool_use',
        name: 'read_file',
        params: { path: 'test.txt' },
        partial: false
      };

      const result = await toolExecutor.executeTool(tool);
      
      expect(executeSingleTool).toHaveBeenCalledWith(mockTask, tool);
      expect(result).toEqual({ toolId: 'test-tool', success: true, result: 'Success' });
    });
  });

  describe('executeToolsInParallel', () => {
    it('should execute tools in parallel', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test1.txt' },
          partial: false
        },
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test2.txt' },
          partial: false
        }
      ];

      const result = await toolExecutor.executeToolsInParallel(tools);
      
      expect(executeToolsInParallel).toHaveBeenCalledWith(mockTask, tools);
      expect(result).toEqual([{ toolId: 'test-tool', success: true, result: 'Success' }]);
    });
  });

  describe('executeToolsSequentially', () => {
    it('should execute tools sequentially', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test1.txt' },
          partial: false
        },
        {
          type: 'tool_use',
          name: 'write_to_file',
          params: { path: 'test2.txt', content: 'content' },
          partial: false
        }
      ];

      const result = await toolExecutor.executeToolsSequentially(tools);
      
      expect(executeToolsSequentially).toHaveBeenCalledWith(mockTask, tools);
      expect(result).toEqual([{ toolId: 'test-tool', success: true, result: 'Success' }]);
    });
  });

  describe('executeCompositeTool', () => {
    it('should execute a composite tool with sequential mode', async () => {
      const compositeTool = {
        type: 'tool_use',
        name: 'composite_tool',
        params: {},
        partial: false,
        toolId: 'composite-test',
        tools: [
          {
            type: 'tool_use',
            name: 'read_file',
            params: { path: 'test.txt' },
            partial: false,
            toolId: 'read-test'
          }
        ],
        mode: ToolExecutionMode.SEQUENTIAL
      };

      const result = await toolExecutor.executeCompositeTool(compositeTool);
      
      expect(enhancedExecutionEngine.executeToolsSequentially).toHaveBeenCalled();
      expect(result).toHaveProperty('toolId', 'composite-test');
      expect(result).toHaveProperty('success', true);
    });

    it('should execute a composite tool with parallel mode', async () => {
      const compositeTool = {
        type: 'tool_use',
        name: 'composite_tool',
        params: {},
        partial: false,
        toolId: 'composite-test',
        tools: [
          {
            type: 'tool_use',
            name: 'read_file',
            params: { path: 'test1.txt' },
            partial: false,
            toolId: 'read-test1'
          },
          {
            type: 'tool_use',
            name: 'read_file',
            params: { path: 'test2.txt' },
            partial: false,
            toolId: 'read-test2'
          }
        ],
        mode: ToolExecutionMode.PARALLEL
      };

      const result = await toolExecutor.executeCompositeTool(compositeTool);
      
      expect(enhancedExecutionEngine.executeToolsInParallel).toHaveBeenCalled();
      expect(result).toHaveProperty('toolId', 'composite-test');
      expect(result).toHaveProperty('success', true);
    });

    it('should execute a composite tool with conditional mode', async () => {
      const compositeTool = {
        type: 'tool_use',
        name: 'composite_tool',
        params: {},
        partial: false,
        toolId: 'composite-test',
        tools: [
          {
            type: 'tool_use',
            name: 'read_file',
            params: { path: 'test.txt' },
            partial: false,
            toolId: 'read-test'
          }
        ],
        mode: ToolExecutionMode.CONDITIONAL
      };

      const result = await toolExecutor.executeCompositeTool(compositeTool);
      
      expect(enhancedExecutionEngine.executeToolsConditionally).toHaveBeenCalled();
      expect(result).toHaveProperty('toolId', 'composite-test');
      expect(result).toHaveProperty('success', true);
    });

    it('should default to sequential mode if mode is not recognized', async () => {
      const compositeTool = {
        type: 'tool_use',
        name: 'composite_tool',
        params: {},
        partial: false,
        toolId: 'composite-test',
        tools: [
          {
            type: 'tool_use',
            name: 'read_file',
            params: { path: 'test.txt' },
            partial: false,
            toolId: 'read-test'
          }
        ],
        mode: 'unknown' as any
      };

      const result = await toolExecutor.executeCompositeTool(compositeTool);
      
      expect(enhancedExecutionEngine.executeToolsSequentially).toHaveBeenCalled();
      expect(result).toHaveProperty('toolId', 'composite-test');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('executeJsonToolExecution', () => {
    it('should execute a JSON tool execution', async () => {
      const jsonExecution = {
        execution: {
          mode: 'sequential',
          tools: [
            {
              name: 'read_file',
              toolId: 'read-test',
              params: {
                path: 'test.txt'
              }
            }
          ]
        }
      };

      const result = await toolExecutor.executeJsonToolExecution(jsonExecution);
      
      expect(enhancedExecutionEngine.executeJsonToolExecution).toHaveBeenCalledWith(mockTask, jsonExecution);
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('executeTools', () => {
    it('should execute a single tool in single mode', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test.txt' },
          partial: false
        }
      ];

      const result = await toolExecutor.executeTools(tools, ToolExecutionMode.SINGLE);
      
      expect(executeSingleTool).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should throw an error if multiple tools are provided in single mode', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test1.txt' },
          partial: false
        },
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test2.txt' },
          partial: false
        }
      ];

      await expect(toolExecutor.executeTools(tools, ToolExecutionMode.SINGLE))
        .rejects.toThrow('Single mode requires exactly one tool');
    });

    it('should execute tools sequentially in sequential mode', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test1.txt' },
          partial: false
        },
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test2.txt' },
          partial: false
        }
      ];

      const result = await toolExecutor.executeTools(tools, ToolExecutionMode.SEQUENTIAL);
      
      expect(executeToolsSequentially).toHaveBeenCalled();
      expect(result).toEqual([{ toolId: 'test-tool', success: true, result: 'Success' }]);
    });

    it('should execute tools in parallel in parallel mode', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test1.txt' },
          partial: false
        },
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test2.txt' },
          partial: false
        }
      ];

      const result = await toolExecutor.executeTools(tools, ToolExecutionMode.PARALLEL);
      
      expect(executeToolsInParallel).toHaveBeenCalled();
      expect(result).toEqual([{ toolId: 'test-tool', success: true, result: 'Success' }]);
    });

    it('should throw an error for unsupported execution mode', async () => {
      const tools = [
        {
          type: 'tool_use',
          name: 'read_file',
          params: { path: 'test.txt' },
          partial: false
        }
      ];

      await expect(toolExecutor.executeTools(tools, 'unknown' as any))
        .rejects.toThrow('Unsupported execution mode: unknown');
    });
  });
});
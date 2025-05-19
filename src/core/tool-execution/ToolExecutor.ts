/**
 * Tool Executor Module
 * 
 * This module provides a centralized class for handling all tool execution operations,
 * including single, sequential, parallel, conditional, and composite execution modes.
 * It integrates with the enhanced execution engine and provides proper error handling
 * and result formatting.
 */

import type { Cline } from "../Cline";
import { formatResponse } from "../prompts/responses";
import { enhancedExecutionEngine } from "./enhanced-execution-engine";
import { JsonToolExecution, BaseTool } from "./json-tool-format";
import { 
  ToolExecutionMode, 
  ToolExecutionResult, 
  MultiToolExecutionResult,
  EnhancedToolUse,
  ExecutionOptions
} from "./types";
import { formatGroupedToolResults } from "./tool-helpers";
import { executeSingleTool, executeToolsInParallel, executeToolsSequentially } from "./index";
import { ToolUse as AssistantToolUse } from "../../shared/tools";

/**
 * ToolExecutor class for handling all tool execution operations
 */
export class ToolExecutor {
  private task: Cline;

  /**
   * Creates a new ToolExecutor instance
   * @param task Task instance
   */
  constructor(task: Cline) {
    this.task = task;
  }

  /**
   * Creates a new execution context compatible with the enhanced execution engine
   * @param mode Execution mode
   * @param options Execution options
   * @returns Execution context
   */
  private createContext(
    mode: ToolExecutionMode,
    options?: ExecutionOptions
  ): any {
    return {
      klaus: this.task,
      sharedState: new Map<string, any>(),
      results: new Map<string, ToolExecutionResult>(),
      mode,
      options
    };
  }

  /**
   * Executes a single tool
   * @param tool Tool to execute
   * @returns Tool execution result
   */
  async executeTool(tool: AssistantToolUse): Promise<ToolExecutionResult> {
    return executeSingleTool(this.task, tool);
  }

  /**
   * Executes tools in parallel
   * @param tools Array of tools to execute in parallel
   * @returns Array of tool execution results
   */
  async executeToolsInParallel(
    tools: AssistantToolUse[]
  ): Promise<ToolExecutionResult[]> {
    return executeToolsInParallel(this.task, tools);
  }

  /**
   * Executes tools sequentially, respecting dependencies
   * @param tools Array of tools to execute sequentially
   * @returns Array of tool execution results
   */
  async executeToolsSequentially(
    tools: AssistantToolUse[]
  ): Promise<ToolExecutionResult[]> {
    return executeToolsSequentially(this.task, tools);
  }

  /**
   * Executes tools conditionally based on conditions
   * @param tools Array of tools to execute conditionally
   * @param options Execution options
   * @returns Array of tool execution results
   */
  async executeToolsConditionally(
    tools: AssistantToolUse[],
    options?: ExecutionOptions
  ): Promise<ToolExecutionResult[]> {
    const context = this.createContext(ToolExecutionMode.CONDITIONAL, options);
    const result = await enhancedExecutionEngine.executeToolsConditionally(context, tools as unknown as BaseTool[]);
    return Array.from(result.results.values());
  }

  /**
   * Executes a composite tool with nested tools
   * @param compositeTool Composite tool to execute
   * @param options Execution options
   * @returns Tool execution result
   */
  async executeCompositeTool(
    compositeTool: EnhancedToolUse & { tools: EnhancedToolUse[], mode: ToolExecutionMode },
    options?: ExecutionOptions
  ): Promise<ToolExecutionResult> {
    const context = this.createContext(compositeTool.mode, options);
    
    // Execute the composite tool based on its mode
    let result: MultiToolExecutionResult;
    
    // Convert tools to BaseTool[] for compatibility with enhanced execution engine
    const baseTools = compositeTool.tools as unknown as BaseTool[];
    
    switch (compositeTool.mode) {
      case ToolExecutionMode.SEQUENTIAL:
        result = await enhancedExecutionEngine.executeToolsSequentially(context, baseTools);
        break;
        
      case ToolExecutionMode.PARALLEL:
        result = await enhancedExecutionEngine.executeToolsInParallel(context, baseTools);
        break;
        
      case ToolExecutionMode.CONDITIONAL:
        result = await enhancedExecutionEngine.executeToolsConditionally(context, baseTools);
        break;
        
      default:
        // Default to sequential execution
        result = await enhancedExecutionEngine.executeToolsSequentially(context, baseTools);
        break;
    }
    
    // Create a result for the composite tool
    return {
      toolId: compositeTool.toolId || '',
      result: formatResponse.toolResult(
        `Executed ${result.results.size} tools in ${compositeTool.mode} mode. ` +
        `Overall success: ${result.success ? 'Yes' : 'No'}`
      ),
      success: result.success,
      metrics: {
        durationMs: Array.from(result.results.values()).reduce(
          (total, r) => total + (r.metrics?.durationMs || 0), 
          0
        )
      }
    };
  }

  /**
   * Executes a JSON tool execution
   * @param jsonExecution JSON tool execution
   * @returns Tool execution result
   */
  async executeJsonToolExecution(
    jsonExecution: JsonToolExecution
  ): Promise<MultiToolExecutionResult> {
    return enhancedExecutionEngine.executeJsonToolExecution(this.task, jsonExecution);
  }

  /**
   * Formats results from multiple tool executions
   * @param mode Execution mode
   * @param results Tool execution results
   * @param originalTools Original tool use objects
   * @returns Formatted result string
   */
  formatResults(
    mode: ToolExecutionMode,
    results: ToolExecutionResult[],
    originalTools: AssistantToolUse[]
  ): string {
    return formatGroupedToolResults(mode, results, originalTools);
  }

  /**
   * Executes tools based on the specified mode
   * @param tools Array of tools to execute
   * @param mode Execution mode
   * @param options Execution options
   * @returns Array of tool execution results
   */
  async executeTools(
    tools: AssistantToolUse[],
    mode: ToolExecutionMode,
    options?: ExecutionOptions
  ): Promise<ToolExecutionResult[]> {
    switch (mode) {
      case ToolExecutionMode.SINGLE:
        if (tools.length === 1) {
          const result = await this.executeTool(tools[0]);
          return [result];
        }
        throw new Error("Single mode requires exactly one tool");
        
      case ToolExecutionMode.SEQUENTIAL:
        return this.executeToolsSequentially(tools);
        
      case ToolExecutionMode.PARALLEL:
        return this.executeToolsInParallel(tools);
        
      case ToolExecutionMode.CONDITIONAL:
        return this.executeToolsConditionally(tools, options);
        
      case ToolExecutionMode.COMPOSITE:
        if (tools.length === 1 && (tools[0] as any).tools) {
          const result = await this.executeCompositeTool(
            tools[0] as EnhancedToolUse & { tools: EnhancedToolUse[], mode: ToolExecutionMode },
            options
          );
          return [result];
        }
        throw new Error("Composite mode requires exactly one composite tool");
        
      default:
        throw new Error(`Unsupported execution mode: ${mode}`);
    }
  }
}
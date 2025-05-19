/**
 * Core type system for enhanced tool execution and multiToolUse functionality.
 * 
 * This module defines standardized interfaces and enums for the tool execution framework,
 * providing a consistent type system that can be used across the codebase.
 */

import { ToolUse, ToolResponse } from "../../shared/tools";
// Using type import to avoid circular dependency issues
import type { Cline } from "../Cline";
// Using Cline as the Task type since Task is not exported
type Task = Cline;

/**
 * Execution mode for tool calls
 */
export enum ToolExecutionMode {
  SINGLE = "single",
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  CONDITIONAL = "conditional",
  COMPOSITE = "composite"
}

/**
 * Type of condition for conditional execution
 */
export enum ConditionType {
  RESULT = "result",
  ERROR = "error",
  CUSTOM = "custom"
}

/**
 * Condition for conditional execution
 */
export interface ExecutionCondition {
  /**
   * Type of condition
   */
  type: ConditionType;
  
  /**
   * Source tool ID to evaluate condition against
   */
  sourceToolId: string;
  
  /**
   * Condition expression
   */
  expression: string;
}

/**
 * Extended tool use interface with properties for enhanced execution
 */
export interface EnhancedToolUse extends ToolUse {
  /**
   * Execution mode for this tool
   */
  mode?: ToolExecutionMode;
  
  /**
   * Unique identifier for this tool instance
   */
  toolId?: string;
  
  /**
   * ID of the tool this tool depends on
   */
  dependsOn?: string;
  
  /**
   * Condition for execution
   */
  condition?: ExecutionCondition;
  
  /**
   * Tool to execute on success
   */
  onSuccess?: string;
  
  /**
   * Tool to execute on failure
   */
  onFailure?: string;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Options for tool execution
 */
export interface ExecutionOptions {
  /**
   * Maximum concurrency for parallel execution
   */
  maxConcurrency?: number;
  
  /**
   * Whether to continue execution after an error
   */
  continueOnError?: boolean;
  
  /**
   * Maximum execution time in milliseconds
   */
  timeout?: number;
}

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  /**
   * Tool ID
   */
  toolId: string;
  
  /**
   * Whether the execution was successful
   */
  success?: boolean;
  
  /**
   * Result data
   */
  result: ToolResponse;
  
  /**
   * Error information
   */
  error?: {
    message: string;
    details?: any;
  };
  
  /**
   * Execution metrics
   */
  metrics?: {
    /**
     * Execution duration in milliseconds
     */
    durationMs: number;
    
    /**
     * Number of retry attempts
     */
    retryCount?: number;
  };
}

/**
 * Result of a multi-tool execution
 */
export interface MultiToolExecutionResult {
  /**
   * Results for each tool
   */
  results: Map<string, ToolExecutionResult>;
  
  /**
   * Overall success status
   */
  success: boolean;
  
  /**
   * Aggregated result (for composite tools)
   */
  aggregatedResult?: any;
}

/**
 * Execution context for tool execution
 */
export interface ExecutionContext {
  /**
   * Task instance
   */
  task: Task;
  
  /**
   * Shared state between tool executions
   */
  sharedState: Map<string, any>;
  
  /**
   * Results of previous tool executions
   */
  results: Map<string, ToolExecutionResult>;
  
  /**
   * Execution mode
   */
  mode: ToolExecutionMode;
  
  /**
   * Execution options
   */
  options?: ExecutionOptions;
}

/**
 * Tool execution handler function type
 */
export type ToolExecutionHandler = (
  context: ExecutionContext,
  tool: EnhancedToolUse
) => Promise<ToolExecutionResult>;

/**
 * Multi-tool execution handler function type
 */
export type MultiToolExecutionHandler = (
  context: ExecutionContext,
  tools: EnhancedToolUse[]
) => Promise<MultiToolExecutionResult>;
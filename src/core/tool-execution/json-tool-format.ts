/**
 * JSON-based tool call format for enhanced tool execution
 * 
 * This module defines TypeScript interfaces for the JSON-based tool call format,
 * which provides a more robust alternative to the XML-based format.
 */

import { ToolName } from "../../schemas";
import { ExecutionCondition } from "./types";

/**
 * Execution mode for tool calls
 * @deprecated Use ToolExecutionMode enum from types.ts instead
 */
export type ExecutionMode = string;

/**
 * Base interface for all tool calls
 */
export interface BaseTool {
  /**
   * Name of the tool
   */
  name: ToolName;
  
  /**
   * Unique identifier for the tool instance
   */
  toolId?: string;
  
  /**
   * ID of the tool this tool depends on
   */
  dependsOn?: string;
  
  /**
   * Tool parameters
   */
  params: Record<string, any>;
}

// ExecutionCondition is now imported from types.ts

/**
 * Tool with conditional execution
 */
export interface ConditionalTool extends BaseTool {
  /**
   * Condition that determines if this tool should execute
   */
  condition: ExecutionCondition;
}

/**
 * Tool with retry configuration
 */
export interface RetryableTool extends BaseTool {
  /**
   * Retry configuration
   */
  retry: {
    /**
     * Maximum number of retry attempts
     */
    maxRetries: number;
    
    /**
     * Backoff time in milliseconds between retries
     */
    backoffMs: number;
    
    /**
     * Whether to use exponential backoff
     */
    exponential?: boolean;
  };
}

/**
 * Tool with fallback configuration
 */
export interface FallbackTool extends BaseTool {
  /**
   * Fallback tool to execute if this tool fails
   */
  fallback: BaseTool;
}

/**
 * Composite tool that contains a sequence of tools
 */
export interface CompositeTool extends BaseTool {
  /**
   * Tools that make up this composite
   */
  tools: BaseTool[];
  
  /**
   * Execution mode for the contained tools
   */
  mode: ExecutionMode;
  
  /**
   * Input mappings from parent to child tools
   */
  inputMappings?: Record<string, string>[];
  
  /**
   * Output mappings from child tools to parent
   */
  outputMappings?: Record<string, string>[];
}

/**
 * Tool execution request using JSON format
 */
export interface JsonToolExecution {
  /**
   * Execution configuration
   */
  execution: {
    /**
     * Execution mode
     */
    mode: ExecutionMode;
    
    /**
     * Tools to execute
     */
    tools: BaseTool[];
    
    /**
     * Execution options
     */
    options?: {
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
    };
  };
}

// ToolExecutionResult is now defined in types.ts

// MultiToolExecutionResult is now defined in types.ts
import { MultiToolExecutionResult } from "./types";
export { MultiToolExecutionResult };

/**
 * Converts a JSON tool execution to the legacy XML format
 * @param jsonExecution JSON tool execution
 * @returns XML string representation
 */
export function convertJsonToXml(jsonExecution: JsonToolExecution): string {
  const { mode, tools } = jsonExecution.execution;
  
  // For single tool, just return the tool XML
  if (mode === "single" && tools.length === 1) {
    return toolToXml(tools[0]);
  }
  
  // For multi-tool execution, wrap in appropriate tags
  let xml = `<multi_tool_use mode="${mode}">\n`;
  
  for (const tool of tools) {
    xml += `  ${toolToXml(tool)}\n`;
  }
  
  xml += `</multi_tool_use>`;
  
  return xml;
}

/**
 * Converts a single tool to XML format
 * @param tool Tool to convert
 * @returns XML string representation
 */
function toolToXml(tool: BaseTool): string {
  let xml = `<${tool.name}>`;
  
  // Add parameters
  for (const [key, value] of Object.entries(tool.params)) {
    xml += `\n  <${key}>${value}</${key}>`;
  }
  
  // Add toolId if present
  if (tool.toolId) {
    xml += `\n  <toolId>${tool.toolId}</toolId>`;
  }
  
  // Add dependsOn if present
  if (tool.dependsOn) {
    xml += `\n  <dependsOn>${tool.dependsOn}</dependsOn>`;
  }
  
  xml += `\n</${tool.name}>`;
  
  return xml;
}

/**
 * Parses XML tool execution into JSON format
 * @param xml XML string to parse
 * @returns JSON tool execution
 */
export function parseXmlToJson(xml: string): JsonToolExecution {
  // This is a placeholder for the actual implementation
  // A real implementation would use a proper XML parser
  
  // Check for multi-tool execution
  const isMultiToolParallel = xml.includes('<multi_tool_use mode="parallel">');
  const isMultiToolSequential = xml.includes('<multi_tool_use mode="sequential">');
  const isParallel = xml.includes('<parallel>');
  const isSequential = xml.includes('<sequential>');
  
  let mode: ExecutionMode = "single";
  
  if (isMultiToolParallel || isParallel) {
    mode = "parallel";
  } else if (isMultiToolSequential || isSequential) {
    mode = "sequential";
  }
  
  // This is just a placeholder - actual implementation would parse the XML
  return {
    execution: {
      mode,
      tools: []
    }
  };
}
/**
 * Enhanced Tool Execution Engine
 * 
 * This module provides an enhanced execution engine for tools, supporting
 * sequential, parallel, conditional, and composite execution modes.
 */

import { Klaus } from "../Cline";
import { ToolUse as AssistantToolUse } from "../assistant-message";
import { ToolResponse, ToolName } from "../../shared/tools";
import { validateToolUse } from "../mode-validator";
import { convertToolUse, ToolExecutionResult } from "./tool-helpers";
import { serializeError } from "serialize-error";
import { ClineAsk, ToolProgressStatus } from "../../schemas";
import { formatResponse } from "../prompts/responses";
import { telemetryService } from "../../services/telemetry/TelemetryService";
import { 
  ExecutionMode, 
  BaseTool, 
  ConditionalTool, 
  RetryableTool,
  FallbackTool,
  CompositeTool,
  JsonToolExecution,
  MultiToolExecutionResult
} from "./json-tool-format";

// Import all tool functions
import { writeToFileTool } from "../tools/writeToFileTool";
import { readFileTool } from "../tools/readFileTool";
import { searchFilesTool } from "../tools/searchFilesTool";
import { listFilesTool } from "../tools/listFilesTool";
import { listCodeDefinitionNamesTool } from "../tools/listCodeDefinitionNamesTool";
import { browserActionTool } from "../tools/browserActionTool";
import { executeCommandTool } from "../tools/executeCommandTool";
import { useMcpToolTool } from "../tools/useMcpToolTool";
import { accessMcpResourceTool } from "../tools/accessMcpResourceTool";
import { askFollowupQuestionTool } from "../tools/askFollowupQuestionTool";
import { attemptCompletionTool } from "../tools/attemptCompletionTool";
import { defaultModeSlug } from "../../shared/modes";

/**
 * Execution context for tool execution
 */
export interface ExecutionContext {
  /**
   * Klaus instance
   */
  klaus: Klaus;
  
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
  mode: ExecutionMode;
  
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
}

/**
 * Enhanced tool execution engine
 */
export class EnhancedExecutionEngine {
  /**
   * Creates a new execution context
   * @param klaus Klaus instance
   * @param mode Execution mode
   * @param options Execution options
   * @returns Execution context
   */
  private createContext(
    klaus: Klaus,
    mode: ExecutionMode,
    options?: {
      maxConcurrency?: number;
      continueOnError?: boolean;
      timeout?: number;
    }
  ): ExecutionContext {
    return {
      klaus,
      sharedState: new Map<string, any>(),
      results: new Map<string, ToolExecutionResult>(),
      mode,
      options
    };
  }
  
  /**
   * Executes a tool
   * @param context Execution context
   * @param tool Tool to execute
   * @returns Tool execution result
   */
  public async executeTool(
    context: ExecutionContext,
    tool: BaseTool
  ): Promise<ToolExecutionResult> {
    const { klaus } = context;
    
    // Convert to assistant tool use format
    const assistantTool: AssistantToolUse = {
      type: "tool_use",
      name: tool.name,
      params: tool.params,
      partial: false,
      toolId: tool.toolId,
      dependsOn: tool.dependsOn
    };
    
    // Handle retryable tool
    if ((tool as RetryableTool).retry) {
      return this.executeRetryableTool(context, tool as RetryableTool);
    }
    
    // Handle fallback tool
    if ((tool as FallbackTool).fallback) {
      return this.executeFallbackTool(context, tool as FallbackTool);
    }
    
    // Handle conditional tool
    if ((tool as ConditionalTool).condition) {
      return this.executeConditionalTool(context, tool as ConditionalTool);
    }
    
    // Handle composite tool
    if ((tool as CompositeTool).tools) {
      return this.executeCompositeTool(context, tool as CompositeTool);
    }
    
    // Execute the tool using the existing executeSingleTool function
    try {
      const startTime = Date.now();
      const result = await this.executeSingleTool(klaus, assistantTool);
      const endTime = Date.now();
      
      // Store the result in the context
      if (tool.toolId) {
        context.results.set(tool.toolId, {
          ...result,
          success: true,
          metrics: {
            durationMs: endTime - startTime
          }
        });
      }
      
      return {
        ...result,
        success: true,
        metrics: {
          durationMs: endTime - startTime
        }
      };
    } catch (error) {
      const errorResult: ToolExecutionResult = {
        toolId: tool.toolId || '',
        success: false,
        error: {
          message: error.message || 'Unknown error',
          details: serializeError(error)
        }
      };
      
      // Store the error in the context
      if (tool.toolId) {
        context.results.set(tool.toolId, errorResult);
      }
      
      return errorResult;
    }
  }
  
  /**
   * Executes a retryable tool
   * @param context Execution context
   * @param tool Retryable tool
   * @returns Tool execution result
   */
  private async executeRetryableTool(
    context: ExecutionContext,
    tool: RetryableTool
  ): Promise<ToolExecutionResult> {
    const { retry } = tool;
    let lastError: any = null;
    let retryCount = 0;
    
    // Create a base tool without retry configuration
    const baseTool: BaseTool = {
      name: tool.name,
      toolId: tool.toolId,
      dependsOn: tool.dependsOn,
      params: tool.params
    };
    
    // Try executing the tool with retries
    while (retryCount <= retry.maxRetries) {
      try {
        const result = await this.executeTool(context, baseTool);
        
        if (result.success) {
          // Add retry count to metrics
          if (retryCount > 0 && result.metrics) {
            result.metrics.retryCount = retryCount;
          }
          
          return result;
        }
        
        lastError = result.error;
      } catch (error) {
        lastError = {
          message: error.message || 'Unknown error',
          details: serializeError(error)
        };
      }
      
      retryCount++;
      
      // If we've reached the maximum retries, break
      if (retryCount > retry.maxRetries) {
        break;
      }
      
      // Calculate backoff time
      let backoffTime = retry.backoffMs;
      if (retry.exponential) {
        backoffTime = retry.backoffMs * Math.pow(2, retryCount - 1);
      }
      
      // Wait for backoff time
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
    
    // If we get here, all retries failed
    return {
      toolId: tool.toolId || '',
      success: false,
      error: lastError,
      metrics: {
        durationMs: 0,
        retryCount
      }
    };
  }
  
  /**
   * Executes a fallback tool
   * @param context Execution context
   * @param tool Fallback tool
   * @returns Tool execution result
   */
  private async executeFallbackTool(
    context: ExecutionContext,
    tool: FallbackTool
  ): Promise<ToolExecutionResult> {
    // Create a base tool without fallback configuration
    const baseTool: BaseTool = {
      name: tool.name,
      toolId: tool.toolId,
      dependsOn: tool.dependsOn,
      params: tool.params
    };
    
    // Try executing the primary tool
    try {
      const result = await this.executeTool(context, baseTool);
      
      if (result.success) {
        return result;
      }
      
      // If primary tool failed, try the fallback
      const fallbackResult = await this.executeTool(context, tool.fallback);
      
      // If fallback has a different toolId, store the result under the original toolId
      if (tool.toolId && tool.fallback.toolId !== tool.toolId) {
        context.results.set(tool.toolId, fallbackResult);
      }
      
      return fallbackResult;
    } catch (error) {
      // If primary tool throws an exception, try the fallback
      return this.executeTool(context, tool.fallback);
    }
  }
  
  /**
   * Executes a conditional tool
   * @param context Execution context
   * @param tool Conditional tool
   * @returns Tool execution result
   */
  private async executeConditionalTool(
    context: ExecutionContext,
    tool: ConditionalTool
  ): Promise<ToolExecutionResult> {
    const { condition } = tool;
    
    // Check if the condition is met
    const shouldExecute = await this.evaluateCondition(context, condition);
    
    if (!shouldExecute) {
      // Condition not met, return a "skipped" result
      const skippedResult: ToolExecutionResult = {
        toolId: tool.toolId || '',
        success: true,
        result: { skipped: true, reason: 'Condition not met' }
      };
      
      // Store the result in the context
      if (tool.toolId) {
        context.results.set(tool.toolId, skippedResult);
      }
      
      return skippedResult;
    }
    
    // Condition met, execute the tool
    const baseTool: BaseTool = {
      name: tool.name,
      toolId: tool.toolId,
      dependsOn: tool.dependsOn,
      params: tool.params
    };
    
    return this.executeTool(context, baseTool);
  }
  
  /**
   * Evaluates a condition
   * @param context Execution context
   * @param condition Condition to evaluate
   * @returns Whether the condition is met
   */
  private async evaluateCondition(
    context: ExecutionContext,
    condition: ExecutionCondition
  ): Promise<boolean> {
    const { sourceToolId, type, expression } = condition;
    
    // Get the result of the source tool
    const sourceResult = context.results.get(sourceToolId);
    if (!sourceResult) {
      return false;
    }
    
    // Evaluate the condition based on the type
    switch (type) {
      case 'result':
        // For result conditions, evaluate the expression against the result
        try {
          // This is a simple implementation - in a real system, you'd want to use
          // a more secure evaluation mechanism
          const evalFn = new Function('result', `return ${expression}`);
          return evalFn(sourceResult.result);
        } catch (error) {
          console.error('Error evaluating condition:', error);
          return false;
        }
        
      case 'error':
        // For error conditions, check if the source tool failed
        return !sourceResult.success;
        
      case 'custom':
        // For custom conditions, evaluate the expression against the entire context
        try {
          const evalFn = new Function(
            'result', 
            'context', 
            'sharedState', 
            `return ${expression}`
          );
          return evalFn(
            sourceResult, 
            context, 
            Object.fromEntries(context.sharedState)
          );
        } catch (error) {
          console.error('Error evaluating custom condition:', error);
          return false;
        }
        
      default:
        return false;
    }
  }
  
  /**
   * Executes a composite tool
   * @param context Execution context
   * @param tool Composite tool
   * @returns Tool execution result
   */
  private async executeCompositeTool(
    context: ExecutionContext,
    tool: CompositeTool
  ): Promise<ToolExecutionResult> {
    // Create a new context for the composite tool
    const compositeContext = this.createContext(
      context.klaus,
      tool.mode,
      context.options
    );
    
    // Apply input mappings if present
    if (tool.inputMappings) {
      for (const mapping of tool.inputMappings) {
        for (const [source, target] of Object.entries(mapping)) {
          // Get the source value from the parent context
          const sourceValue = context.sharedState.get(source);
          if (sourceValue !== undefined) {
            // Set the target value in the composite context
            compositeContext.sharedState.set(target, sourceValue);
          }
        }
      }
    }
    
    // Execute the tools in the composite
    let result: MultiToolExecutionResult;
    
    switch (tool.mode) {
      case 'sequential':
        result = await this.executeToolsSequentially(compositeContext, tool.tools);
        break;
        
      case 'parallel':
        result = await this.executeToolsInParallel(compositeContext, tool.tools);
        break;
        
      case 'conditional':
        // For conditional mode, we execute each tool conditionally
        result = await this.executeToolsConditionally(compositeContext, tool.tools);
        break;
        
      default:
        // Default to sequential execution
        result = await this.executeToolsSequentially(compositeContext, tool.tools);
    }
    
    // Apply output mappings if present
    if (tool.outputMappings) {
      for (const mapping of tool.outputMappings) {
        for (const [source, target] of Object.entries(mapping)) {
          // Get the source value from the composite context
          const sourceValue = compositeContext.sharedState.get(source);
          if (sourceValue !== undefined) {
            // Set the target value in the parent context
            context.sharedState.set(target, sourceValue);
          }
        }
      }
    }
    
    // Create a result for the composite tool
    const compositeResult: ToolExecutionResult = {
      toolId: tool.toolId || '',
      success: result.success,
      result: result.aggregatedResult || result.results,
      metrics: {
        durationMs: result.results.reduce(
          (total, r) => total + (r.metrics?.durationMs || 0), 
          0
        )
      }
    };
    
    // Store the result in the context
    if (tool.toolId) {
      context.results.set(tool.toolId, compositeResult);
    }
    
    return compositeResult;
  }
  
  /**
   * Executes a single tool
   * @param context Klaus instance
   * @param tool Tool to execute
   * @returns Tool execution result
   */
  private async executeSingleTool(
    context: Klaus, 
    tool: AssistantToolUse
  ): Promise<ToolExecutionResult> {
    if (context.abort) {
      throw new Error(`[executeSingleTool] task ${context.taskId}.${context.instanceId} aborted`);
    }
    
    let result: ToolResponse = "Tool execution failed without specific error";
    
    // Create handlers for the tool execution
    const askApproval = async (
      type: ClineAsk,
      partialMessage?: string,
      progressStatus?: ToolProgressStatus
    ) => {
      const { response, text, images } = await context.ask(type, partialMessage, false, progressStatus);
      if (response !== "yesButtonClicked") {
        // Handle both messageResponse and noButtonClicked with text
        if (text) {
          await context.say("user_feedback", text, images);
          result = formatResponse.toolResult(
            `The user denied this operation with feedback: ${text}`,
            images
          );
        } else {
          result = formatResponse.toolDenied();
        }
        return false;
      }
      // Handle yesButtonClicked with text
      if (text) {
        await context.say("user_feedback", text, images);
        result = formatResponse.toolResult(
          `The user approved this operation with feedback: ${text}`,
          images
        );
      }
      return true;
    };
  
    const handleError = async (action: string, error: Error) => {
      const errorString = `Error ${action}: ${JSON.stringify(serializeError(error))}`;
      await context.say(
        "error",
        `Error ${action}:\n${error.message ?? JSON.stringify(serializeError(error), null, 2)}`,
      );
      result = formatResponse.toolError(errorString);
    };
  
    const pushToolResult = (content: ToolResponse) => {
      result = content;
    };
  
    const removeClosingTag = (tag: string, content?: string) => {
      if (!content) {
        return "";
      }
      // This regex dynamically constructs a pattern to match the closing tag:
      // - Optionally matches whitespace before the tag
      // - Matches '<' or '</' optionally followed by any subset of characters from the tag name
      const tagRegex = new RegExp(
        `\\s?<\/?${tag
          .split("")
          .map((char) => `(?:${char})?`)
          .join("")}$`,
        "g",
      );
      return content.replace(tagRegex, "");
    };
  
    if (tool.name !== "browser_action") {
      await context.browserSession.closeBrowser();
    }
    
    // Record tool usage
    context.recordToolUsage(tool.name as ToolName);
    telemetryService.captureToolUsage(context.taskId, tool.name as ToolName);
    
    // Validate tool use
    const { mode, customModes } = (await context.providerRef.deref()?.getState()) ?? {};
    try {
      validateToolUse(
        tool.name as ToolName,
        mode ?? defaultModeSlug,
        customModes ?? [],
        { apply_diff: context.diffEnabled },
        tool.params
      );
    } catch (error) {
      context.consecutiveMistakeCount++;
      result = formatResponse.toolError(error.message);
      return { toolId: tool.toolId || '', result };
    }
    
    // Convert to shared tool format for compatibility
    const sharedTool = convertToolUse(tool);
    
    try {
      switch (tool.name) {
        case "write_to_file":
          await writeToFileTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "read_file":
          await readFileTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "search_files":
          await searchFilesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "list_files":
          await listFilesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "list_code_definition_names":
          await listCodeDefinitionNamesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "browser_action":
          await browserActionTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "execute_command":
          await executeCommandTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "use_mcp_tool":
          await useMcpToolTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "access_mcp_resource":
          await accessMcpResourceTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "ask_followup_question":
          await askFollowupQuestionTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag);
          break;
        case "attempt_completion":
          await attemptCompletionTool(
            context, 
            sharedTool, 
            askApproval, 
            handleError, 
            pushToolResult, 
            removeClosingTag, 
            () => `[${tool.name}]`,
            async () => {
              // ask the user to approve this task has completed
              const toolMessage = JSON.stringify({
                tool: "finishTask",
              });
              return await askApproval("tool", toolMessage);
            }
          );
          break;
        default:
          result = formatResponse.toolError(`Tool '${tool.name}' is not implemented or not available`);
      }
    } catch (error) {
      // Handle any unexpected errors during tool execution
      await handleError("executing tool", error);
    }
    
    return {
      toolId: tool.toolId || '',
      result
    };
  }
  
  /**
   * Executes tools in parallel
   * @param context Execution context
   * @param tools Tools to execute
   * @returns Multi-tool execution result
   */
  public async executeToolsInParallel(
    context: ExecutionContext,
    tools: BaseTool[]
  ): Promise<MultiToolExecutionResult> {
    if (context.klaus.abort) {
      throw new Error(`[executeToolsInParallel] task ${context.klaus.taskId}.${context.klaus.instanceId} aborted`);
    }
    
    // Determine concurrency limit
    const maxConcurrency = context.options?.maxConcurrency || 4;
    
    // Execute tools in batches to control concurrency
    const results: ToolExecutionResult[] = [];
    for (let i = 0; i < tools.length; i += maxConcurrency) {
      const batch = tools.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(tool => this.executeTool(context, tool));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // Determine overall success
    const success = context.options?.continueOnError || 
      results.every(result => result.success);
    
    return {
      results,
      success,
      aggregatedResult: results.map(r => r.result)
    };
  }
  
  /**
   * Executes tools sequentially
   * @param context Execution context
   * @param tools Tools to execute
   * @returns Multi-tool execution result
   */
  public async executeToolsSequentially(
    context: ExecutionContext,
    tools: BaseTool[]
  ): Promise<MultiToolExecutionResult> {
    if (context.klaus.abort) {
      throw new Error(`[executeToolsSequentially] task ${context.klaus.taskId}.${context.klaus.instanceId} aborted`);
    }
    
    const results: ToolExecutionResult[] = [];
    const completedToolIds = new Set<string>();
    
    // Sort tools by dependency chain
    const sortedTools: BaseTool[] = [];
    const pendingTools = [...tools];
    
    // Keep processing until we've handled all tools
    while (pendingTools.length > 0) {
      const initialLength = pendingTools.length;
      
      // Find tools that have no unresolved dependencies
      for (let i = pendingTools.length - 1; i >= 0; i--) {
        const tool = pendingTools[i];
        
        // If tool has no dependencies or its dependency is already processed
        if (!tool.dependsOn || completedToolIds.has(tool.dependsOn)) {
          sortedTools.push(tool);
          pendingTools.splice(i, 1);
        }
      }
      
      // If we made no progress in this iteration, we have a circular dependency
      if (initialLength === pendingTools.length && pendingTools.length > 0) {
        // Add a warning and just process them in the order they were defined
        await context.klaus.say(
          "error",
          "Warning: Circular dependency detected in sequential tool execution. Tools will be executed in their defined order."
        );
        sortedTools.push(...pendingTools);
        break;
      }
    }
    
    // Execute tools in dependency order
    for (const tool of sortedTools) {
      if (context.klaus.abort) {
        break;
      }
      
      const result = await this.executeTool(context, tool);
      results.push(result);
      
      if (tool.toolId) {
        completedToolIds.add(tool.toolId);
      }
      
      // If a tool fails and continueOnError is false, stop execution
      if (!result.success && !context.options?.continueOnError) {
        break;
      }
    }
    
    // Determine overall success
    const success = context.options?.continueOnError || 
      results.every(result => result.success);
    
    return {
      results,
      success,
      aggregatedResult: results.map(r => r.result)
    };
  }
  
  /**
   * Executes tools conditionally
   * @param context Execution context
   * @param tools Tools to execute
   * @returns Multi-tool execution result
   */
  public async executeToolsConditionally(
    context: ExecutionContext,
    tools: BaseTool[]
  ): Promise<MultiToolExecutionResult> {
    if (context.klaus.abort) {
      throw new Error(`[executeToolsConditionally] task ${context.klaus.taskId}.${context.klaus.instanceId} aborted`);
    }
    
    const results: ToolExecutionResult[] = [];
    
    // Execute each tool, but only if it's a conditional tool and the condition is met
    for (const tool of tools) {
      if (context.klaus.abort) {
        break;
      }
      
      // For conditional tools, evaluate the condition
      if ((tool as ConditionalTool).condition) {
        const result = await this.executeConditionalTool(
          context, 
          tool as ConditionalTool
        );
        results.push(result);
      } else {
        // For non-conditional tools, just execute them
        const result = await this.executeTool(context, tool);
        results.push(result);
      }
      
      // If a tool fails and continueOnError is false, stop execution
      if (!results[results.length - 1].success && !context.options?.continueOnError) {
        break;
      }
    }
    
    // Determine overall success
    const success = context.options?.continueOnError || 
      results.every(result => result.success);
    
    return {
      results,
      success,
      aggregatedResult: results.map(r => r.result)
    };
  }
  
  /**
   * Executes a JSON tool execution
   * @param klaus Klaus instance
   * @param jsonExecution JSON tool execution
   * @returns Multi-tool execution result
   */
  public async executeJsonToolExecution(
    klaus: Klaus,
    jsonExecution: JsonToolExecution
  ): Promise<MultiToolExecutionResult> {
    const { mode, tools, options } = jsonExecution.execution;
    
    // Create execution context
    const context = this.createContext(klaus, mode, options);
    
    // Execute tools based on mode
    switch (mode) {
      case 'parallel':
        return this.executeToolsInParallel(context, tools);
        
      case 'sequential':
        return this.executeToolsSequentially(context, tools);
        
      case 'conditional':
        return this.executeToolsConditionally(context, tools);
        
      case 'composite':
        // For composite mode, we treat the first tool as a composite tool
        if (tools.length > 0 && (tools[0] as CompositeTool).tools) {
          const result = await this.executeCompositeTool(
            context, 
            tools[0] as CompositeTool
          );
          return {
            results: [result],
            success: result.success,
            aggregatedResult: result.result
          };
        }
        // Fall through to single mode if no composite tools
        
      case 'single':
      default:
        // For single mode, just execute the first tool
        if (tools.length > 0) {
          const result = await this.executeTool(context, tools[0]);
          return {
            results: [result],
            success: result.success,
            aggregatedResult: result.result
          };
        }
        return {
          results: [],
          success: true
        };
    }
  }
}

// Export singleton instance
export const enhancedExecutionEngine = new EnhancedExecutionEngine();
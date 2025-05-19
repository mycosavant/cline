import { Task } from "../Cline"
import { ToolUse as AssistantToolUse } from "../assistant-message"
import { ToolResponse, ToolName, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { validateToolUse } from "../mode-validator"
import { convertToolUse } from "./tool-helpers"
import { serializeError } from "serialize-error"
import { ClineAsk, ToolProgressStatus } from "../../schemas"
import { formatResponse } from "../prompts/responses"
import { telemetryService } from "../../services/telemetry/TelemetryService"
import { enhancedExecutionEngine } from "./enhanced-execution-engine"
import { JsonToolExecution } from "./json-tool-format"
import { ToolExecutionResult } from "./types"

// Import all tool functions
import { writeToFileTool } from "../tools/writeToFileTool"
import { readFileTool } from "../tools/readFileTool"
import { searchFilesTool } from "../tools/searchFilesTool"
import { listFilesTool } from "../tools/listFilesTool"
import { listCodeDefinitionNamesTool } from "../tools/listCodeDefinitionNamesTool"
import { browserActionTool } from "../tools/browserActionTool"
import { executeCommandTool } from "../tools/executeCommandTool"
import { useMcpToolTool } from "../tools/useMcpToolTool"
import { accessMcpResourceTool } from "../tools/accessMcpResourceTool"
import { askFollowupQuestionTool } from "../tools/askFollowupQuestionTool"
import { attemptCompletionTool } from "../tools/attemptCompletionTool"
import { defaultModeSlug } from "../../shared/modes"

/**
 * Executes a single tool call
 * @param context Cline instance context
 * @param tool Tool use descriptor
 * @returns Promise with tool execution result
 */
export async function executeSingleTool(
  context: Cline,
  tool: AssistantToolUse
): Promise<ToolExecutionResult> {
  // Check if this is a JSON tool execution
  if (tool.name === "json_tool_execution" && (tool as any).jsonExecution) {
    return executeJsonTool(context, (tool as any).jsonExecution);
  }
  if (context.abort) {
    throw new Error(`[executeSingleTool] task ${context.taskId}.${context.instanceId} aborted`)
  }
  
  let result: ToolResponse = "Tool execution failed without specific error"
  
  // Create handlers for the tool execution
  const askApproval: AskApproval = async (
    type: ClineAsk,
    partialMessage?: string,
    progressStatus?: ToolProgressStatus
  ) => {
    const { response, text, images } = await context.ask(type, partialMessage, false, progressStatus)
    if (response !== "yesButtonClicked") {
      // Handle both messageResponse and noButtonClicked with text
      if (text) {
        await context.say("user_feedback", text, images)
        result = formatResponse.toolResult(
          `The user denied this operation with feedback: ${text}`,
          images
        )
      } else {
        result = formatResponse.toolDenied()
      }
      return false
    }
    // Handle yesButtonClicked with text
    if (text) {
      await context.say("user_feedback", text, images)
      result = formatResponse.toolResult(
        `The user approved this operation with feedback: ${text}`,
        images
      )
    }
    return true
  }

  const handleError: HandleError = async (action: string, error: Error) => {
    const errorString = `Error ${action}: ${JSON.stringify(serializeError(error))}`
    await context.say(
      "error",
      `Error ${action}:\n${error.message ?? JSON.stringify(serializeError(error), null, 2)}`,
    )
    result = formatResponse.toolError(errorString)
  }

  const pushToolResult: PushToolResult = (content: ToolResponse) => {
    result = content
  }

  const removeClosingTag: RemoveClosingTag = (tag, content) => {
    if (!content) {
      return ""
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
    )
    return content.replace(tagRegex, "")
  }

  if (tool.name !== "browser_action") {
    await context.browserSession.closeBrowser()
  }
  
  // Record tool usage
  context.recordToolUsage(tool.name as ToolName)
  telemetryService.captureToolUsage(context.taskId, tool.name as ToolName)
  
  // Validate tool use
  const { mode, customModes } = (await context.providerRef.deref()?.getState()) ?? {}
  try {
    validateToolUse(
      tool.name as ToolName,
      mode ?? defaultModeSlug,
      customModes ?? [],
      { apply_diff: context.diffEnabled },
      tool.params
    )
  } catch (error) {
    context.consecutiveMistakeCount++
    result = formatResponse.toolError(error.message)
    return { toolId: tool.toolId || '', result }
  }
  
  // Convert to shared tool format for compatibility
  const sharedTool = convertToolUse(tool)
  
  try {
    switch (tool.name) {
      case "write_to_file":
        await writeToFileTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "read_file":
        await readFileTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "search_files":
        await searchFilesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "list_files":
        await listFilesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "list_code_definition_names":
        await listCodeDefinitionNamesTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "browser_action":
        await browserActionTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "execute_command":
        await executeCommandTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "use_mcp_tool":
        await useMcpToolTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "access_mcp_resource":
        await accessMcpResourceTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
      case "ask_followup_question":
        await askFollowupQuestionTool(context, sharedTool, askApproval, handleError, pushToolResult, removeClosingTag)
        break
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
            })
            return await askApproval("tool", toolMessage)
          }
        )
        break
      default:
        result = formatResponse.toolError(`Tool '${tool.name}' is not implemented or not available`)
    }
  } catch (error) {
    // Handle any unexpected errors during tool execution
    await handleError("executing tool", error)
  }
  
  return {
    toolId: tool.toolId || '',
    result
  }
}

/**
 * Executes a JSON tool execution
 * @param context Cline instance context
 * @param jsonExecution JSON tool execution
 * @returns Tool execution result
 */
export async function executeJsonTool(
  context: Task,
  jsonExecution: JsonToolExecution
): Promise<ToolExecutionResult> {
  if (context.abort) {
    throw new Error(`[executeJsonTool] task ${context.taskId}.${context.instanceId} aborted`)
  }
  
  try {
    // Execute the JSON tool execution using the enhanced execution engine
    const result = await enhancedExecutionEngine.executeJsonToolExecution(context, jsonExecution);
    
    // Format the result for display
    const toolResult: ToolExecutionResult = {
      toolId: 'json_execution',
      result: formatResponse.toolResult(
        `Executed ${result.results.length} tools in ${jsonExecution.execution.mode} mode. ` +
        `Overall success: ${result.success ? 'Yes' : 'No'}`
      )
    };
    
    return toolResult;
  } catch (error) {
    return {
      toolId: 'json_execution',
      result: formatResponse.toolError(`Error executing JSON tool: ${error.message}`)
    };
  }
}

/**
 * Executes tools in parallel
 * @param context Cline instance context
 * @param tools Array of tools to execute in parallel
 * @returns Array of tool execution results
 */
export async function executeToolsInParallel(
  context: Task,
  tools: AssistantToolUse[]
): Promise<ToolExecutionResult[]> {
  if (context.abort) {
    throw new Error(`[executeToolsInParallel] task ${context.taskId}.${context.instanceId} aborted`)
  }
  
  // Execute all tool calls in parallel
  const promises = tools.map(tool => executeSingleTool(context, tool))
  const results = await Promise.all(promises)
  
  return results
}

/**
 * Executes tools sequentially, respecting dependencies
 * @param context Cline instance context
 * @param tools Array of tools to execute sequentially
 * @returns Array of tool execution results
 */
export async function executeToolsSequentially(
  context: Task,
  tools: AssistantToolUse[]
): Promise<ToolExecutionResult[]> {
  if (context.abort) {
    throw new Error(`[executeToolsSequentially] task ${context.taskId}.${context.instanceId} aborted`)
  }
  
  const results: ToolExecutionResult[] = []
  const completedToolIds = new Set<string>()
  
  // Sort tools by dependency chain
  const sortedTools: AssistantToolUse[] = []
  const pendingTools = [...tools]
  
  // Keep processing until we've handled all tools
  while (pendingTools.length > 0) {
    const initialLength = pendingTools.length
    
    // Find tools that have no unresolved dependencies
    for (let i = pendingTools.length - 1; i >= 0; i--) {
      const tool = pendingTools[i]
      
      // If tool has no dependencies or its dependency is already processed
      if (!tool.dependsOn || completedToolIds.has(tool.dependsOn)) {
        sortedTools.push(tool)
        pendingTools.splice(i, 1)
      }
    }
    
    // If we made no progress in this iteration, we have a circular dependency
    if (initialLength === pendingTools.length && pendingTools.length > 0) {
      // Add a warning and just process them in the order they were defined
      await context.say(
        "error",
        "Warning: Circular dependency detected in sequential tool execution. Tools will be executed in their defined order."
      )
      sortedTools.push(...pendingTools)
      break
    }
  }
  
  // Execute tools in dependency order
  for (const tool of sortedTools) {
    if (context.abort) {
      break
    }
    
    const result = await executeSingleTool(context, tool)
    results.push(result)
    
    if (tool.toolId) {
      completedToolIds.add(tool.toolId)
    }
  }
  
  return results
}

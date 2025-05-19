import { ToolUse as AssistantToolUse } from "../assistant-message"
import { ToolUse as SharedToolUse, ToolResponse } from "../../shared/tools"
import { ToolExecutionMode, ToolExecutionResult } from "./types"
import { ToolName } from "../../schemas"

/**
 * Converts from the assistant message ToolUse to the shared ToolUse format
 * that's compatible with the tool implementation functions
 */
export function convertToolUse(tool: AssistantToolUse): SharedToolUse {
  return {
    type: "tool_use",
    name: tool.name as ToolName,
    params: tool.params,
    partial: tool.partial
  }
}

/**
 * Formats a tool description for display in messages
 */
export function getToolDescription(block: AssistantToolUse): string {
  switch (block.name) {
    case "execute_command":
      return `[${block.name} for '${block.params.command}']`
    case "read_file":
      return `[${block.name} for '${block.params.path}']`
    case "write_to_file":
      return `[${block.name} for '${block.params.path}']`
    case "search_files":
      return `[${block.name} for '${block.params.regex}'${
        block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
      }]`
    case "list_files":
      return `[${block.name} for '${block.params.path}']`
    case "list_code_definition_names":
      return `[${block.name} for '${block.params.path}']`
    case "browser_action":
      return `[${block.name} for '${block.params.action}']`
    case "use_mcp_tool":
      return `[${block.name} for '${block.params.server_name}']`
    case "access_mcp_resource":
      return `[${block.name} for '${block.params.server_name}']`
    case "ask_followup_question":
      return `[${block.name} for '${block.params.question}']`
    case "attempt_completion":
      return `[${block.name}]`
    default:
      return `[${block.name}]`
  }
}

// ToolExecutionResult is now imported from types.ts

/**
 * Creates a formatted result for grouped tool execution
 */
export function formatGroupedToolResults(
  mode: ToolExecutionMode,
  results: ToolExecutionResult[],
  originalTools: AssistantToolUse[]
): string {
  // Map results by toolId for easier reference
  const resultMap = new Map<string, ToolResponse>(
    results.map(r => [r.toolId, r.result])
  )

  // Build output string with header indicating execution mode
  let output = `[${mode === 'parallel' ? 'Parallel' : 'Sequential'} tool execution results]\n\n`

  // Add results for each tool with its description
  for (const tool of originalTools) {
    if (!tool.toolId) continue
    
    const result = resultMap.get(tool.toolId)
    if (!result) continue
    
    const desc = getToolDescription(tool)
    output += `${desc} Result:\n`
    
    if (typeof result === 'string') {
      output += result
    } else if (Array.isArray(result)) {
      // For array results, extract text content
      const textContent = result
        .filter(item => item.type === 'text')
        .map(item => (item as any).text)
        .join('\n\n')
      output += textContent || '(no text content)'
    }
    
    output += '\n\n'
  }

  return output
}

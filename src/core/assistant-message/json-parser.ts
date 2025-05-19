import { AssistantMessageContent } from "."
import { v4 as uuidv4 } from 'uuid'
import { ToolExecutionMode } from "../tool-execution/types"
import {
  BaseTool,
  JsonToolExecution
} from "../tool-execution/json-tool-format"

// Map from ToolExecutionMode enum to string for validation
const validModes: string[] = [
  ToolExecutionMode.SINGLE,
  ToolExecutionMode.SEQUENTIAL,
  ToolExecutionMode.PARALLEL,
  ToolExecutionMode.CONDITIONAL,
  ToolExecutionMode.COMPOSITE
];

/**
 * Parses JSON tool execution blocks from an assistant message
 */
export function parseJsonToolExecution(assistantMessage: string): {
  jsonExecution: JsonToolExecution | null;
  startIndex: number;
  endIndex: number;
} {
  // Look for JSON blocks that might contain tool executions
  const jsonBlockRegex = /```(?:json)?\s*({[\s\S]*?})```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(assistantMessage)) !== null) {
    const jsonString = match[1];
    try {
      const jsonObject = JSON.parse(jsonString);
      
      // Check if this is a valid tool execution object
      if (jsonObject && 
          jsonObject.execution && 
          jsonObject.execution.mode && 
          Array.isArray(jsonObject.execution.tools)) {
        
        // Validate the execution mode
        if (!validModes.includes(jsonObject.execution.mode)) {
          continue;
        }
        
        // Validate that each tool has a name and params
        const validTools = jsonObject.execution.tools.every((tool: any) => 
          tool.name && tool.params && typeof tool.name === 'string'
        );
        
        if (!validTools) {
          continue;
        }
        
        // Ensure each tool has a toolId
        jsonObject.execution.tools = jsonObject.execution.tools.map((tool: BaseTool) => ({
          ...tool,
          toolId: tool.toolId || uuidv4()
        }));
        
        return {
          jsonExecution: jsonObject as JsonToolExecution,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        };
      }
    } catch (error) {
      // Not valid JSON, continue searching
      continue;
    }
  }
  
  return {
    jsonExecution: null,
    startIndex: -1,
    endIndex: -1
  };
}

/**
 * Processes a JSON tool execution block and returns the parsed content blocks
 */
export function processJsonToolExecutionBlock(
  assistantMessage: string, 
  jsonExecution: JsonToolExecution,
  startIndex: number,
  endIndex: number
): AssistantMessageContent[] {
  const contentBlocks: AssistantMessageContent[] = [];
  
  // Text before the block
  if (startIndex > 0) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(0, startIndex).trim(),
      partial: false
    });
  }
  
  // Add a special tool use block that represents the JSON execution
  // This will be handled by the enhanced execution engine
  // Create a special content block for JSON execution
  // We'll cast to any to avoid type issues, as this is a special internal type
  // that will be handled by the enhanced execution engine
  contentBlocks.push({
    type: "tool_use",
    name: "json_tool_execution" as any,
    params: {
      execution: JSON.stringify(jsonExecution.execution)
    },
    partial: false,
    jsonExecution: jsonExecution
  } as any);
  
  // Text after the block
  if (endIndex < assistantMessage.length) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(endIndex).trim(),
      partial: false
    });
  }
  
  return contentBlocks;
}
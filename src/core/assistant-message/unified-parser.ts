import { AssistantMessageContent } from "."
import { TextContent, ToolUse, ToolParamName, toolParamNames } from "../../shared/tools"
import { ToolName } from "../../schemas"
import { parseJsonToolExecution, processJsonToolExecutionBlock } from "./json-parser"
import { EnhancedToolUse, ToolExecutionMode } from "../tool-execution/types"

// Define types needed for the parser
type ToolUseName = ToolName

// Create a list of tool names from the ToolName type
const toolUseNames: ToolName[] = [
  "execute_command",
  "read_file",
  "fetch_instructions",
  "write_to_file",
  "apply_diff",
  "search_files",
  "list_files",
  "list_code_definition_names",
  "browser_action",
  "use_mcp_tool",
  "access_mcp_resource",
  "ask_followup_question",
  "attempt_completion",
  "switch_mode",
  "new_task",
  "insert_content",
  "search_and_replace"
]

// Use EnhancedToolUse throughout the parser implementation
export type ParsedToolUse = EnhancedToolUse;
import { v4 as uuidv4 } from 'uuid'

/**
 * Unified parser implementation that combines the strengths of existing parsers
 * with enhanced support for multi-tool execution blocks, robust error handling,
 * and comprehensive validation.
 */

/**
 * Interface representing a multi-tool execution block
 */
interface MultiToolBlock {
  type: 'parallel' | 'sequential';
  startIndex: number;
  endIndex: number;
  tagName: string;
  closeTagName: string;
}

/**
 * Detects multi-tool execution blocks in the assistant message
 * @param assistantMessage The message to scan for multi-tool blocks
 * @returns Array of detected multi-tool blocks with their positions and types
 */
function detectMultiToolBlocks(assistantMessage: string): MultiToolBlock[] {
  const blocks: MultiToolBlock[] = [];
  
  // Check for modern format tags
  const modernParallelRegex = /<multi_tool_use\s+mode\s*=\s*["']parallel["']\s*>/i;
  const modernSequentialRegex = /<multi_tool_use\s+mode\s*=\s*["']sequential["']\s*>/i;
  
  // Check for legacy format tags
  const legacyParallelRegex = /<parallel>/i;
  const legacySequentialRegex = /<sequential>/i;
  
  // Process modern parallel blocks
  let match = modernParallelRegex.exec(assistantMessage);
  if (match) {
    const startIndex = match.index;
    const tagName = match[0];
    const closeTagName = "</multi_tool_use>";
    const endIndex = assistantMessage.indexOf(closeTagName, startIndex + tagName.length);
    
    if (endIndex !== -1) {
      blocks.push({
        type: 'parallel',
        startIndex,
        endIndex: endIndex + closeTagName.length,
        tagName,
        closeTagName
      });
    }
  }
  
  // Process modern sequential blocks
  match = modernSequentialRegex.exec(assistantMessage);
  if (match) {
    const startIndex = match.index;
    const tagName = match[0];
    const closeTagName = "</multi_tool_use>";
    const endIndex = assistantMessage.indexOf(closeTagName, startIndex + tagName.length);
    
    if (endIndex !== -1) {
      blocks.push({
        type: 'sequential',
        startIndex,
        endIndex: endIndex + closeTagName.length,
        tagName,
        closeTagName
      });
    }
  }
  
  // Process legacy parallel blocks
  match = legacyParallelRegex.exec(assistantMessage);
  if (match) {
    const startIndex = match.index;
    const tagName = match[0];
    const closeTagName = "</parallel>";
    const endIndex = assistantMessage.indexOf(closeTagName, startIndex + tagName.length);
    
    if (endIndex !== -1) {
      blocks.push({
        type: 'parallel',
        startIndex,
        endIndex: endIndex + closeTagName.length,
        tagName,
        closeTagName
      });
    }
  }
  
  // Process legacy sequential blocks
  match = legacySequentialRegex.exec(assistantMessage);
  if (match) {
    const startIndex = match.index;
    const tagName = match[0];
    const closeTagName = "</sequential>";
    const endIndex = assistantMessage.indexOf(closeTagName, startIndex + tagName.length);
    
    if (endIndex !== -1) {
      blocks.push({
        type: 'sequential',
        startIndex,
        endIndex: endIndex + closeTagName.length,
        tagName,
        closeTagName
      });
    }
  }
  
  return blocks;
}

/**
 * Parses tool calls from a block of text with enhanced validation
 * @param blockContent The content to parse for tool calls
 * @param execMode The execution mode to apply to parsed tool calls
 * @returns Array of parsed tool calls
 */
function parseToolCallsFromBlock(blockContent: string, execMode: ToolExecutionMode = ToolExecutionMode.SINGLE): ToolUse[] {
  const toolCalls: ToolUse[] = [];
  let pos = 0;
  
  while (pos < blockContent.length) {
    // Find opening tag for any tool
    const openTagStart = blockContent.indexOf("<", pos);
    if (openTagStart === -1) break;
    
    const openTagEnd = blockContent.indexOf(">", openTagStart);
    if (openTagEnd === -1) break;
    
    const tagName = blockContent.slice(openTagStart + 1, openTagEnd).trim();
    
    // Check if this is a valid tool name
    if (!toolUseNames.includes(tagName as ToolUseName)) {
      pos = openTagEnd + 1;
      continue;
    }
    
    const toolName = tagName as ToolUseName;
    
    // Find closing tag
    const closeTag = `</${toolName}>`;
    const closeTagStart = blockContent.indexOf(closeTag, openTagEnd);
    if (closeTagStart === -1) {
      pos = openTagEnd + 1;
      continue;
    }
    
    // Extract the tool content
    const toolContent = blockContent.slice(openTagEnd + 1, closeTagStart);
    
    // Parse regular parameters
    const params: Partial<Record<ToolParamName, string>> = {};
    let toolId: string | undefined = undefined;
    let dependsOn: string | undefined = undefined;
    
    // Extract toolId and dependsOn from tool content
    const toolIdMatch = /<toolId>(.*?)<\/toolId>/s.exec(toolContent);
    if (toolIdMatch && toolIdMatch[1]) {
      toolId = toolIdMatch[1].trim();
    }
    
    const dependsOnMatch = /<dependsOn>(.*?)<\/dependsOn>/s.exec(toolContent);
    if (dependsOnMatch && dependsOnMatch[1]) {
      dependsOn = dependsOnMatch[1].trim();
    }
    
    // Parse regular parameters
    for (const paramName of toolParamNames) {
      const paramOpenTag = `<${paramName}>`;
      const paramCloseTag = `</${paramName}>`;
      
      const paramStart = toolContent.indexOf(paramOpenTag);
      if (paramStart === -1) continue;
      
      const paramContentStart = paramStart + paramOpenTag.length;
      const paramEnd = toolContent.indexOf(paramCloseTag, paramContentStart);
      if (paramEnd === -1) continue;
      
      params[paramName] = toolContent.slice(paramContentStart, paramEnd).trim();
    }
    
    // Special handling for write_to_file content parameter
    if (toolName === "write_to_file" && toolContent.includes("<content>")) {
      const contentParamName: ToolParamName = "content";
      const contentStartTag = `<${contentParamName}>`;
      const contentEndTag = `</${contentParamName}>`;
      const contentStart = toolContent.indexOf(contentStartTag);
      const contentEnd = toolContent.lastIndexOf(contentEndTag);
      
      if (contentStart !== -1 && contentEnd !== -1 && contentEnd > contentStart) {
        params[contentParamName] = toolContent
          .slice(contentStart + contentStartTag.length, contentEnd)
          .trim();
      }
    }
    
    // Create the tool use object with an ID to track dependencies
    toolCalls.push({
      type: "tool_use",
      name: toolName,
      params,
      partial: false,
      mode: execMode,
      toolId: toolId || uuidv4(),
      dependsOn
    } as ParsedToolUse);
    
    pos = closeTagStart + closeTag.length;
  }
  
  // Validate dependency chain
  validateDependencyChain(toolCalls, execMode);
  
  return toolCalls;
}

/**
 * Validates the dependency chain for a set of tool calls
 * @param toolCalls Array of tool calls to validate
 * @param execMode The execution mode being used
 */
function validateDependencyChain(toolCalls: ParsedToolUse[], execMode: ToolExecutionMode): void {
  // Validate all toolIds are unique
  const toolIds = new Set<string>();
  for (const tool of toolCalls) {
    if (tool.toolId && toolIds.has(tool.toolId)) {
      console.warn(`Duplicate toolId found: ${tool.toolId}. Generating new ID.`);
      tool.toolId = uuidv4();
    }
    if (tool.toolId) {
      toolIds.add(tool.toolId);
    }
  }
  
  // For sequential execution, set up default chain if not explicitly specified
  if (execMode === ToolExecutionMode.SEQUENTIAL && toolCalls.length > 1) {
    for (let i = 1; i < toolCalls.length; i++) {
      if (!toolCalls[i].dependsOn && toolCalls[i-1].toolId) {
        // Each tool depends on the previous one in sequential mode (if not already specified)
        toolCalls[i].dependsOn = toolCalls[i-1].toolId;
      }
    }
  }
  
  // Validate all dependsOn references exist
  for (const tool of toolCalls) {
    if (tool.dependsOn && !toolIds.has(tool.dependsOn)) {
      console.warn(`Invalid dependsOn reference: ${tool.dependsOn}. Dependency will be ignored.`);
      tool.dependsOn = undefined;
    }
  }
  
  // Check for circular dependencies (simple check for direct cycles)
  for (const tool of toolCalls) {
    if (tool.toolId && tool.dependsOn && tool.toolId === tool.dependsOn) {
      console.warn(`Circular dependency detected: ${tool.toolId}. Dependency will be removed.`);
      tool.dependsOn = undefined;
    }
  }
}

/**
 * Process an execution block (parallel or sequential) and return the parsed content blocks
 * @param assistantMessage Full message from assistant
 * @param block The multi-tool block to process
 * @returns Array of content blocks from the processed execution block
 */
function processMultiToolBlock(assistantMessage: string, block: MultiToolBlock): AssistantMessageContent[] {
  const contentBlocks: AssistantMessageContent[] = [];
  
  // Extract block content
  const blockContent = assistantMessage.slice(
    block.startIndex + block.tagName.length, 
    block.endIndex - block.closeTagName.length
  );
  
  // Parse tool calls with the appropriate mode
  const mode: ToolExecutionMode = block.type === 'parallel' ? ToolExecutionMode.PARALLEL : ToolExecutionMode.SEQUENTIAL;
  const toolCalls = parseToolCallsFromBlock(blockContent, mode);
  
  // Text before the block
  if (block.startIndex > 0) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(0, block.startIndex).trim(),
      partial: false
    });
  }
  
  // Add the tool calls
  contentBlocks.push(...toolCalls);
  
  // Text after the block
  if (block.endIndex < assistantMessage.length) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(block.endIndex).trim(),
      partial: false
    });
  }
  
  return contentBlocks;
}

/**
 * Process single tool calls in an assistant message
 * @param assistantMessage The message to parse for single tool calls
 * @returns Array of parsed content blocks
 */
function processSingleToolCalls(assistantMessage: string): AssistantMessageContent[] {
  const contentBlocks: AssistantMessageContent[] = [];
  let currentTextContent: TextContent | null = null;
  let inToolUse = false;
  let currentToolUse: ParsedToolUse | null = null;
  let currentToolName: ToolUseName | null = null;
  
  // Process the message character by character
  for (let i = 0; i < assistantMessage.length; i++) {
    const char = assistantMessage[i];
    
    // Check for tool tag start
    if (char === '<' && !inToolUse) {
      const tagEndIndex = assistantMessage.indexOf('>', i);
      if (tagEndIndex !== -1) {
        const tagName = assistantMessage.slice(i + 1, tagEndIndex);
        
        // Check if this is a valid tool name
        if (toolUseNames.includes(tagName as ToolUseName)) {
          // If we were collecting text, add it to our blocks
          if (currentTextContent) {
            contentBlocks.push(currentTextContent);
            currentTextContent = null;
          }
          
          inToolUse = true;
          currentToolName = tagName as ToolUseName;
          currentToolUse = {
            type: "tool_use",
            name: currentToolName,
            params: {},
            partial: false,
            mode: ToolExecutionMode.SINGLE,
            toolId: uuidv4()
          } as ParsedToolUse;
          
          // Skip past the opening tag
          i = tagEndIndex;
          continue;
        }
      }
    }
    
    // Check for tool tag end
    if (inToolUse && currentToolName && char === '<' && i + 2 + currentToolName.length < assistantMessage.length) {
      const closeTag = `</${currentToolName}>`;
      if (assistantMessage.slice(i, i + closeTag.length) === closeTag) {
        // We found a complete tool tag, add it to our blocks
        if (currentToolUse) {
          contentBlocks.push(currentToolUse);
          currentToolUse = null;
        }
        
        inToolUse = false;
        currentToolName = null;
        
        // Skip past the closing tag
        i += closeTag.length - 1;
        continue;
      }
    }
    
    // Inside tool use - look for parameters
    if (inToolUse && currentToolUse) {
      // Look for parameter tags
      for (const paramName of toolParamNames) {
        const paramOpenTag = `<${paramName}>`;
        const paramCloseTag = `</${paramName}>`;
        
        if (i + paramOpenTag.length <= assistantMessage.length && 
            assistantMessage.slice(i, i + paramOpenTag.length) === paramOpenTag) {
          
          const paramCloseIndex = assistantMessage.indexOf(paramCloseTag, i + paramOpenTag.length);
          if (paramCloseIndex !== -1) {
            // Found a parameter - extract its value
            const paramValue = assistantMessage.slice(i + paramOpenTag.length, paramCloseIndex);
            currentToolUse.params[paramName] = paramValue.trim();
            
            // Skip past this parameter
            i = paramCloseIndex + paramCloseTag.length - 1;
            break;
          }
        }
      }
      
      // Check for toolId and dependsOn parameters
      const toolIdOpenTag = "<toolId>";
      const toolIdCloseTag = "</toolId>";
      if (i + toolIdOpenTag.length <= assistantMessage.length && 
          assistantMessage.slice(i, i + toolIdOpenTag.length) === toolIdOpenTag) {
        
        const toolIdCloseIndex = assistantMessage.indexOf(toolIdCloseTag, i + toolIdOpenTag.length);
        if (toolIdCloseIndex !== -1) {
          // Found a toolId - extract its value
          const toolIdValue = assistantMessage.slice(i + toolIdOpenTag.length, toolIdCloseIndex);
          (currentToolUse as ParsedToolUse).toolId = toolIdValue.trim();
          
          // Skip past this parameter
          i = toolIdCloseIndex + toolIdCloseTag.length - 1;
          continue;
        }
      }
      
      const dependsOnOpenTag = "<dependsOn>";
      const dependsOnCloseTag = "</dependsOn>";
      if (i + dependsOnOpenTag.length <= assistantMessage.length && 
          assistantMessage.slice(i, i + dependsOnOpenTag.length) === dependsOnOpenTag) {
        
        const dependsOnCloseIndex = assistantMessage.indexOf(dependsOnCloseTag, i + dependsOnOpenTag.length);
        if (dependsOnCloseIndex !== -1) {
          // Found a dependsOn - extract its value
          const dependsOnValue = assistantMessage.slice(i + dependsOnOpenTag.length, dependsOnCloseIndex);
          (currentToolUse as ParsedToolUse).dependsOn = dependsOnValue.trim();
          
          // Skip past this parameter
          i = dependsOnCloseIndex + dependsOnCloseTag.length - 1;
          continue;
        }
      }
      
      // Continue processing other tool content...
      continue;
    }
    
    // Outside tool use - collect text content
    if (!inToolUse) {
      if (!currentTextContent) {
        currentTextContent = {
          type: "text",
          content: char,
          partial: false
        };
      } else {
        currentTextContent.content += char;
      }
    }
  }
  
  // Add any final text content
  if (currentTextContent) {
    contentBlocks.push(currentTextContent);
  }
  
  // If we have an unclosed tool tag, mark it as partial
  if (currentToolUse) {
    currentToolUse.partial = true;
    contentBlocks.push(currentToolUse);
  }
  
  return contentBlocks;
}

/**
 * Parses the assistant message into content blocks, handling various execution modes
 * @param assistantMessage The message from the assistant to parse
 * @returns Array of content blocks (text or tool use)
 */
export function parseAssistantMessage(assistantMessage: string): AssistantMessageContent[] {
  // First check for JSON tool execution blocks
  const { jsonExecution, startIndex, endIndex } = parseJsonToolExecution(assistantMessage);
  
  if (jsonExecution) {
    // Process the JSON tool execution block
    return processJsonToolExecutionBlock(assistantMessage, jsonExecution, startIndex, endIndex);
  }
  
  // If no JSON blocks found, check for multi-tool execution blocks
  const multiToolBlocks = detectMultiToolBlocks(assistantMessage);
  
  if (multiToolBlocks.length > 0) {
    // Sort blocks by start index to process them in order
    multiToolBlocks.sort((a, b) => a.startIndex - b.startIndex);
    
    // Process the first block (we currently only support one multi-tool block per message)
    return processMultiToolBlock(assistantMessage, multiToolBlocks[0]);
  }
  
  // If no multi-tool blocks found, process as single tool calls
  return processSingleToolCalls(assistantMessage);
}
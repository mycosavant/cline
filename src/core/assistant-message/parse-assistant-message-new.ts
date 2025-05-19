import { AssistantMessageContent, TextContent, ToolUse, ToolParamName, toolParamNames, toolUseNames, ToolUseName, ToolExecutionMode } from "."
import { v4 as uuidv4 } from 'uuid'

/**
 * Improved version of the parse-assistant-message.ts that handles multi-tool execution blocks
 * with more robust parsing and error handling for both parallel and sequential execution.
 */

/**
 * Parses tool calls from a block of text
 * @param blockContent The content to parse for tool calls
 * @param execMode The execution mode to apply to parsed tool calls
 * @returns Array of parsed tool calls
 */
function parseToolCallsFromBlock(blockContent: string, execMode: ToolExecutionMode = "single"): ToolUse[] {
  const toolCalls: ToolUse[] = []
  let pos = 0
  
  while (pos < blockContent.length) {
    // Find opening tag for any tool
    const openTagStart = blockContent.indexOf("<", pos)
    if (openTagStart === -1) break
    
    const openTagEnd = blockContent.indexOf(">", openTagStart)
    if (openTagEnd === -1) break
    
    const tagName = blockContent.slice(openTagStart + 1, openTagEnd).trim()
    
    // Check if this is a valid tool name
    if (!toolUseNames.includes(tagName as ToolUseName)) {
      pos = openTagEnd + 1
      continue
    }
    
    const toolName = tagName as ToolUseName
    
    // Find closing tag
    const closeTag = `</${toolName}>`
    const closeTagStart = blockContent.indexOf(closeTag, openTagEnd)
    if (closeTagStart === -1) {
      pos = openTagEnd + 1
      continue
    }
    
    // Extract the tool content
    const toolContent = blockContent.slice(openTagEnd + 1, closeTagStart)
    
    // Parse regular parameters
    const params: Partial<Record<ToolParamName, string>> = {}
    let toolId: string | undefined = undefined
    let dependsOn: string | undefined = undefined
    
    // Extract toolId and dependsOn from tool content
    const toolIdMatch = /<toolId>(.*?)<\/toolId>/s.exec(toolContent)
    if (toolIdMatch && toolIdMatch[1]) {
      toolId = toolIdMatch[1].trim()
    }
    
    const dependsOnMatch = /<dependsOn>(.*?)<\/dependsOn>/s.exec(toolContent)
    if (dependsOnMatch && dependsOnMatch[1]) {
      dependsOn = dependsOnMatch[1].trim()
    }
    
    // Parse regular parameters
    for (const paramName of toolParamNames) {
      const paramOpenTag = `<${paramName}>`
      const paramCloseTag = `</${paramName}>`
      
      const paramStart = toolContent.indexOf(paramOpenTag)
      if (paramStart === -1) continue
      
      const paramContentStart = paramStart + paramOpenTag.length
      const paramEnd = toolContent.indexOf(paramCloseTag, paramContentStart)
      if (paramEnd === -1) continue
      
      params[paramName] = toolContent.slice(paramContentStart, paramEnd).trim()
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
    })
    
    pos = closeTagStart + closeTag.length
  }
  
  // For sequential execution, if dependencies aren't explicitly specified,
  // set up a default chain where each tool depends on the previous one
  if (execMode === "sequential" && toolCalls.length > 1) {
    for (let i = 1; i < toolCalls.length; i++) {
      if (!toolCalls[i].dependsOn && toolCalls[i-1].toolId) {
        toolCalls[i].dependsOn = toolCalls[i-1].toolId
      }
    }
  }
  
  return toolCalls
}

/**
 * Process an execution block (parallel or sequential) and return the parsed content blocks
 * @param assistantMessage Full message from assistant
 * @param blockType Type of block ('parallel' or 'sequential')
 * @param tagName Optional custom tag name for the block (defaults to blockType)
 * @returns Array of content blocks from the processed execution block
 */
function processExecutionBlock(assistantMessage: string, blockType: 'parallel' | 'sequential', tagName?: string): AssistantMessageContent[] {
  const contentBlocks: AssistantMessageContent[] = []
  const openTag = tagName ? `<${tagName}>` : `<${blockType}>`
  const closeTag = tagName ? `</${tagName}>` : `</${blockType}>`
  
  // Find the block
  const openTagIndex = assistantMessage.indexOf(openTag)
  const closeTagIndex = assistantMessage.indexOf(closeTag)
  
  if (openTagIndex === -1 || closeTagIndex === -1 || closeTagIndex <= openTagIndex) {
    // If we can't find proper tags, return an empty array
    return []
  }
  
  // Extract block content
  const blockContent = assistantMessage.slice(openTagIndex + openTag.length, closeTagIndex)
  
  // Parse tool calls with the appropriate mode
  const mode: ToolExecutionMode = blockType === 'parallel' ? 'parallel' : 'sequential'
  const toolCalls = parseToolCallsFromBlock(blockContent, mode)
  
  // Text before the block
  if (openTagIndex > 0) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(0, openTagIndex).trim(),
      partial: false
    })
  }
  
  // Add the tool calls
  contentBlocks.push(...toolCalls)
  
  // Text after the block
  const endIndex = closeTagIndex + closeTag.length
  if (endIndex < assistantMessage.length) {
    contentBlocks.push({
      type: "text",
      content: assistantMessage.slice(endIndex).trim(),
      partial: false
    })
  }
  
  return contentBlocks
}

/**
 * Parses the assistant message into content blocks, handling various execution modes
 * @param assistantMessage The message from the assistant to parse
 * @returns Array of content blocks (text or tool use)
 */
export function parseAssistantMessage(assistantMessage: string): AssistantMessageContent[] {
  // Check for multi-tool execution blocks with the modern format
  const multiToolParallelMatch = /<multi_tool_use\s+mode\s*=\s*["']parallel["']\s*>/i.test(assistantMessage)
  const multiToolSequentialMatch = /<multi_tool_use\s+mode\s*=\s*["']sequential["']\s*>/i.test(assistantMessage)
  
  // Check for legacy format direct mode tags
  const parallelMatch = /<parallel>/i.test(assistantMessage)
  const sequentialMatch = /<sequential>/i.test(assistantMessage)
  
  if (multiToolParallelMatch) {
    // Handle multi-tool parallel execution block with the modern format
    return processExecutionBlock(assistantMessage, 'parallel', 'multi_tool_use mode="parallel"')
  } 
  else if (multiToolSequentialMatch) {
    // Handle multi-tool sequential execution block with the modern format
    return processExecutionBlock(assistantMessage, 'sequential', 'multi_tool_use mode="sequential"')
  }
  else if (parallelMatch) {
    // Handle legacy parallel execution block
    return processExecutionBlock(assistantMessage, 'parallel')
  } 
  else if (sequentialMatch) {
    // Handle legacy sequential execution block
    return processExecutionBlock(assistantMessage, 'sequential')
  }
  
  // Standard single message parsing if no multi-tool blocks were found
  const contentBlocks: AssistantMessageContent[] = []
  let currentTextContent: TextContent | null = null
  let inToolUse = false
  let currentToolUse: ToolUse | null = null
  let currentToolName: ToolUseName | null = null
  
  // Process the message character by character
  for (let i = 0; i < assistantMessage.length; i++) {
    const char = assistantMessage[i]
    
    // Check for tool tag start
    if (char === '<' && !inToolUse) {
      const tagEndIndex = assistantMessage.indexOf('>', i)
      if (tagEndIndex !== -1) {
        const tagName = assistantMessage.slice(i + 1, tagEndIndex)
        
        // Check if this is a valid tool name
        if (toolUseNames.includes(tagName as ToolUseName)) {
          // If we were collecting text, add it to our blocks
          if (currentTextContent) {
            contentBlocks.push(currentTextContent)
            currentTextContent = null
          }
          
          inToolUse = true
          currentToolName = tagName as ToolUseName
          currentToolUse = {
            type: "tool_use",
            name: currentToolName,
            params: {},
            partial: false,
            mode: "single",
            toolId: uuidv4()
          }
          
          // Skip past the opening tag
          i = tagEndIndex
          continue
        }
      }
    }
    
    // Check for tool tag end
    if (inToolUse && currentToolName && char === '<' && i + 2 + currentToolName.length < assistantMessage.length) {
      const closeTag = `</${currentToolName}>`
      if (assistantMessage.slice(i, i + closeTag.length) === closeTag) {
        // We found a complete tool tag, add it to our blocks
        if (currentToolUse) {
          contentBlocks.push(currentToolUse)
          currentToolUse = null
        }
        
        inToolUse = false
        currentToolName = null
        
        // Skip past the closing tag
        i += closeTag.length - 1
        continue
      }
    }
    
    // Inside tool use - look for parameters
    if (inToolUse && currentToolUse) {
      // Look for parameter tags
      for (const paramName of toolParamNames) {
        const paramOpenTag = `<${paramName}>`
        const paramCloseTag = `</${paramName}>`
        
        if (i + paramOpenTag.length <= assistantMessage.length && 
            assistantMessage.slice(i, i + paramOpenTag.length) === paramOpenTag) {
          
          const paramCloseIndex = assistantMessage.indexOf(paramCloseTag, i + paramOpenTag.length)
          if (paramCloseIndex !== -1) {
            // Found a parameter - extract its value
            const paramValue = assistantMessage.slice(i + paramOpenTag.length, paramCloseIndex)
            currentToolUse.params[paramName] = paramValue.trim()
            
            // Skip past this parameter
            i = paramCloseIndex + paramCloseTag.length - 1
            break
          }
        }
      }
      
      // Check for toolId and dependsOn parameters
      const toolIdOpenTag = "<toolId>"
      const toolIdCloseTag = "</toolId>"
      if (i + toolIdOpenTag.length <= assistantMessage.length && 
          assistantMessage.slice(i, i + toolIdOpenTag.length) === toolIdOpenTag) {
        
        const toolIdCloseIndex = assistantMessage.indexOf(toolIdCloseTag, i + toolIdOpenTag.length)
        if (toolIdCloseIndex !== -1) {
          // Found a toolId - extract its value
          const toolIdValue = assistantMessage.slice(i + toolIdOpenTag.length, toolIdCloseIndex)
          currentToolUse.toolId = toolIdValue.trim()
          
          // Skip past this parameter
          i = toolIdCloseIndex + toolIdCloseTag.length - 1
          continue
        }
      }
      
      const dependsOnOpenTag = "<dependsOn>"
      const dependsOnCloseTag = "</dependsOn>"
      if (i + dependsOnOpenTag.length <= assistantMessage.length && 
          assistantMessage.slice(i, i + dependsOnOpenTag.length) === dependsOnOpenTag) {
        
        const dependsOnCloseIndex = assistantMessage.indexOf(dependsOnCloseTag, i + dependsOnOpenTag.length)
        if (dependsOnCloseIndex !== -1) {
          // Found a dependsOn - extract its value
          const dependsOnValue = assistantMessage.slice(i + dependsOnOpenTag.length, dependsOnCloseIndex)
          currentToolUse.dependsOn = dependsOnValue.trim()
          
          // Skip past this parameter
          i = dependsOnCloseIndex + dependsOnCloseTag.length - 1
          continue
        }
      }
      
      // Continue processing other tool content...
      continue
    }
    
    // Outside tool use - collect text content
    if (!inToolUse) {
      if (!currentTextContent) {
        currentTextContent = {
          type: "text",
          content: char,
          partial: false
        }
      } else {
        currentTextContent.content += char
      }
    }
  }
  
  // Add any final text content
  if (currentTextContent) {
    contentBlocks.push(currentTextContent)
  }
  
  // If we have an unclosed tool tag, mark it as partial
  if (currentToolUse) {
    currentToolUse.partial = true
    contentBlocks.push(currentToolUse)
  }
  
  return contentBlocks
}
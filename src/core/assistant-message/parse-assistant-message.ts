import { AssistantMessageContent, TextContent, ToolUse, ToolParamName, toolParamNames, toolUseNames, ToolUseName, ToolExecutionMode } from "."
import { v4 as uuidv4 } from 'uuid'

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
    
    const tagName = blockContent.slice(openTagStart + 1, openTagEnd)
    
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
    
    // First extract toolId and dependsOn if present
    const toolIdMatch = /<toolId>(.*?)<\/toolId>/s.exec(toolContent)
    if (toolIdMatch && toolIdMatch[1]) {
      toolId = toolIdMatch[1].trim()
    }
    
    const dependsOnMatch = /<dependsOn>(.*?)<\/dependsOn>/s.exec(toolContent)
    if (dependsOnMatch && dependsOnMatch[1]) {
      dependsOn = dependsOnMatch[1].trim()
    }
    
    // Then extract regular parameters
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
  
  // Add dependency references for sequential execution if not explicitly specified
  if (execMode === "sequential" && toolCalls.length > 1) {
    for (let i = 1; i < toolCalls.length; i++) {
      if (!toolCalls[i].dependsOn && toolCalls[i-1].toolId) {
        // Each tool depends on the previous one in sequential mode (if not already specified)
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
  
  // Parse tool calls
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

export function parseAssistantMessage(assistantMessage: string): AssistantMessageContent[] {
  // First check for multi-tool execution blocks
  const multiToolParallelMatch = assistantMessage.match(/<multi_tool_use mode="parallel">([\s\S]*?)<\/multi_tool_use>/)
  const multiToolSequentialMatch = assistantMessage.match(/<multi_tool_use mode="sequential">([\s\S]*?)<\/multi_tool_use>/)
  
  // Also check for legacy format (direct mode tags)
  const parallelMatch = assistantMessage.match(/<parallel>([\s\S]*?)<\/parallel>/)
  const sequentialMatch = assistantMessage.match(/<sequential>([\s\S]*?)<\/sequential>/)
  
  if (multiToolParallelMatch) {
    // Handle multi-tool parallel execution block
    return processExecutionBlock(assistantMessage, 'parallel', 'multi_tool_use mode="parallel"')
  } 
  else if (multiToolSequentialMatch) {
    // Handle multi-tool sequential execution block
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
		contentBlocks.push(currentToolUse)
	}

	// Note: it doesnt matter if check for currentToolUse or currentTextContent, only one of them will be defined since only one can be partial at a time
	if (currentTextContent) {
		// stream did not complete text content, add it as partial
		contentBlocks.push(currentTextContent)
	}

	return contentBlocks
}

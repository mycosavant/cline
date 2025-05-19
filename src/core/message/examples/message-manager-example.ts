/**
 * Example usage of the MessageManager class
 * 
 * This example demonstrates how to use the MessageManager class to parse and process
 * assistant messages with tool execution blocks.
 */

import { Task } from "../../task/Task";
import { MessageManager } from "../MessageManager";
import { ToolExecutionMode } from "../../tool-execution/types";

/**
 * Example function demonstrating how to use MessageManager to process a message with tool blocks
 * @param task Task instance
 * @param message Assistant message to process
 */
export async function processMessageWithTools(task: Task, message: string): Promise<void> {
  // Create a new MessageManager instance
  const messageManager = new MessageManager(task);
  
  // Parse the message into content blocks
  const contentBlocks = messageManager.parseMessage(message);
  
  // Update the message manager with the parsed content
  messageManager.updateMessageContent(contentBlocks);
  
  // Present the message to the user
  await messageManager.presentMessage();
  
  // Example of collecting and executing tools in different modes
  console.log("Message contains the following tools:");
  
  // Collect all tool blocks with default SINGLE mode
  const toolBlocks = messageManager.collectToolBlocks(ToolExecutionMode.SINGLE);
  console.log(`Found ${toolBlocks.length} tool blocks`);
  
  // Check if there are multiple tools that could be executed in parallel
  if (toolBlocks.length > 1) {
    console.log("Executing tools in parallel mode:");
    const parallelTools = messageManager.collectParallelToolBlocks();
    const parallelResults = await messageManager.executeToolsInParallel(parallelTools);
    console.log(`Parallel execution completed with ${parallelResults.length} results`);
  }
  
  // Example of sequential execution
  if (toolBlocks.length > 1) {
    console.log("Executing tools in sequential mode:");
    const sequentialTools = messageManager.collectSequentialToolBlocks();
    const sequentialResults = await messageManager.executeToolsSequentially(sequentialTools);
    console.log(`Sequential execution completed with ${sequentialResults.length} results`);
  }
}

/**
 * Example function demonstrating how to use MessageManager to process a message with JSON tool execution
 * @param task Task instance
 */
export async function processJsonToolExecution(task: Task): Promise<void> {
  // Create a new MessageManager instance
  const messageManager = new MessageManager(task);
  
  // Example JSON tool execution message
  const jsonMessage = `
Let me execute these tools for you:

\`\`\`json
{
  "execution": {
    "mode": "sequential",
    "tools": [
      {
        "name": "read_file",
        "params": {
          "path": "example.txt"
        },
        "toolId": "tool-1"
      },
      {
        "name": "write_to_file",
        "params": {
          "path": "output.txt",
          "content": "Example content",
          "line_count": 1
        },
        "toolId": "tool-2",
        "dependsOn": "tool-1"
      }
    ]
  }
}
\`\`\`

This will read the example file and write to the output file.
  `;
  
  // Parse the message into content blocks
  const contentBlocks = messageManager.parseMessage(jsonMessage);
  
  // Update the message manager with the parsed content
  messageManager.updateMessageContent(contentBlocks);
  
  // Present the message to the user
  await messageManager.presentMessage();
}

/**
 * Example of how to integrate MessageManager with the existing Cline class
 * 
 * This is a simplified example showing how the MessageManager could be integrated
 * into the existing codebase.
 */
export function integrateWithCline(): void {
  // Example integration code
  console.log(`
Integration with Cline class:

1. Create a MessageManager instance in the Cline constructor:
   this.messageManager = new MessageManager(this);

2. Replace direct calls to parseAssistantMessage:
   // Before:
   this.assistantMessageContent = parseAssistantMessage(message);
   
   // After:
   this.assistantMessageContent = this.messageManager.parseMessage(message);
   this.messageManager.updateMessageContent(this.assistantMessageContent);

3. Replace presentAssistantMessage function:
   // Before:
   await presentAssistantMessage(this);
   
   // After:
   await this.messageManager.presentMessage();

4. For multi-tool execution:
   // Collect tools
   const tools = this.messageManager.collectToolBlocks(ToolExecutionMode.PARALLEL);
   
   // Execute tools
   const results = await this.messageManager.executeToolsInParallel(tools);
   
   // Process results
   results.forEach(result => {
     // Handle each tool result
   });
  `);
}
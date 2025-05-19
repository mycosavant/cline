# MessageManager

The MessageManager class provides a centralized system for handling message parsing and presentation, with special support for tool execution blocks. It serves as the bridge between assistant messages and the tool execution system.

## Overview

The MessageManager is designed to:

1. Parse assistant messages into structured content blocks
2. Handle different types of tool execution blocks (single, sequential, parallel)
3. Present messages to users with proper formatting
4. Coordinate tool execution with the ToolExecutor
5. Manage message state during streaming responses

## Key Features

- **Unified Message Parsing**: Handles both standard XML-style tool blocks and JSON tool execution blocks
- **Multi-Tool Execution Support**: Collects and executes tools in different modes (single, sequential, parallel)
- **Streaming Support**: Properly handles partial content blocks during streaming
- **Error Handling**: Provides robust error handling for malformed messages and tool execution failures
- **Tool Result Formatting**: Formats tool results for consistent presentation

## Usage

### Basic Usage

```typescript
// Create a MessageManager instance
const messageManager = new MessageManager(task);

// Parse a message
const contentBlocks = messageManager.parseMessage(assistantMessage);

// Update the message content
messageManager.updateMessageContent(contentBlocks);

// Present the message to the user
await messageManager.presentMessage();
```

### Tool Execution

```typescript
// Collect tool blocks with specific execution mode
const toolBlocks = messageManager.collectToolBlocks(ToolExecutionMode.SEQUENTIAL);

// Execute tools sequentially
const results = await messageManager.executeToolsSequentially(toolBlocks);

// Or execute tools in parallel
const parallelResults = await messageManager.executeToolsInParallel(toolBlocks);
```

### JSON Tool Execution

The MessageManager can parse and process JSON tool execution blocks:

```typescript
const jsonMessage = `
\`\`\`json
{
  "execution": {
    "mode": "sequential",
    "tools": [
      {
        "name": "read_file",
        "params": {
          "path": "example.txt"
        }
      },
      {
        "name": "write_to_file",
        "params": {
          "path": "output.txt",
          "content": "Example content",
          "line_count": 1
        }
      }
    ]
  }
}
\`\`\`
`;

const contentBlocks = messageManager.parseMessage(jsonMessage);
messageManager.updateMessageContent(contentBlocks);
await messageManager.presentMessage();
```

## API Reference

### Constructor

```typescript
constructor(task: Task)
```

Creates a new MessageManager instance.

- `task`: Task instance that the MessageManager will operate on

### Methods

#### `parseMessage(message: string): AssistantMessageContent[]`

Parses an assistant message into content blocks.

- `message`: Assistant message to parse
- Returns: Array of parsed content blocks

#### `updateMessageContent(content: AssistantMessageContent[]): void`

Updates the message content with new blocks.

- `content`: Array of content blocks

#### `appendMessageContent(content: AssistantMessageContent[]): void`

Appends new content blocks to the existing message content.

- `content`: Array of content blocks to append

#### `getMessageContent(): AssistantMessageContent[]`

Gets the current message content.

- Returns: Array of content blocks

#### `reset(): void`

Resets the message manager state.

#### `collectToolBlocks(mode?: ToolExecutionMode): ToolUse[]`

Collects tool blocks from the message content.

- `mode`: Execution mode for the tools (default: `ToolExecutionMode.SINGLE`)
- Returns: Array of tool use blocks

#### `collectSequentialToolBlocks(): ToolUse[]`

Collects sequential tool blocks from the message content.

- Returns: Array of tool use blocks for sequential execution

#### `collectParallelToolBlocks(): ToolUse[]`

Collects parallel tool blocks from the message content.

- Returns: Array of tool use blocks for parallel execution

#### `presentMessage(): Promise<void>`

Presents the message content to the user.

- Returns: Promise that resolves when presentation is complete

#### `executeTool(tool: ToolUse): Promise<ToolExecutionResult>`

Executes a tool and handles the result.

- `tool`: Tool to execute
- Returns: Promise with tool execution result

#### `executeToolsInParallel(tools: ToolUse[]): Promise<ToolExecutionResult[]>`

Executes multiple tools in parallel.

- `tools`: Array of tools to execute
- Returns: Promise with array of tool execution results

#### `executeToolsSequentially(tools: ToolUse[]): Promise<ToolExecutionResult[]>`

Executes multiple tools sequentially.

- `tools`: Array of tools to execute
- Returns: Promise with array of tool execution results

#### `executeTools(tools: ToolUse[], mode: ToolExecutionMode): Promise<ToolExecutionResult[]>`

Executes tools based on the specified mode.

- `tools`: Array of tools to execute
- `mode`: Execution mode
- Returns: Promise with array of tool execution results

## Integration with Cline

The MessageManager is designed to be integrated with the existing Cline class:

1. Create a MessageManager instance in the Cline constructor:
   ```typescript
   this.messageManager = new MessageManager(this);
   ```

2. Replace direct calls to parseAssistantMessage:
   ```typescript
   // Before:
   this.assistantMessageContent = parseAssistantMessage(message);
   
   // After:
   this.assistantMessageContent = this.messageManager.parseMessage(message);
   this.messageManager.updateMessageContent(this.assistantMessageContent);
   ```

3. Replace presentAssistantMessage function:
   ```typescript
   // Before:
   await presentAssistantMessage(this);
   
   // After:
   await this.messageManager.presentMessage();
   ```

4. For multi-tool execution:
   ```typescript
   // Collect tools
   const tools = this.messageManager.collectToolBlocks(ToolExecutionMode.PARALLEL);
   
   // Execute tools
   const results = await this.messageManager.executeToolsInParallel(tools);
   
   // Process results
   results.forEach(result => {
     // Handle each tool result
   });
   ```

## Error Handling

The MessageManager provides comprehensive error handling for:

- Malformed messages
- Invalid tool parameters
- Tool execution failures
- User rejections of tool operations

Errors are properly propagated and presented to the user with clear messages.
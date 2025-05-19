# ToolExecutor Class Documentation

The `ToolExecutor` class is a central component for handling all tool execution operations in the Roo-Code VSCode extension. It provides a unified interface for executing tools in different modes, including single, sequential, parallel, conditional, and composite execution.

## Overview

The `ToolExecutor` class is designed to:

1. Provide a consistent interface for tool execution
2. Support different execution modes
3. Handle execution context management
4. Provide proper error handling and result formatting
5. Integrate with the enhanced execution engine

## Installation

The `ToolExecutor` class is part of the core tool execution module and can be imported as follows:

```typescript
import { ToolExecutor } from "../core/tool-execution/ToolExecutor";
```

## Usage

### Creating a ToolExecutor Instance

To create a new `ToolExecutor` instance, you need to provide a `Cline` instance:

```typescript
import { Cline } from "../core/Cline";
import { ToolExecutor } from "../core/tool-execution/ToolExecutor";

const cline = new Cline(/* options */);
const toolExecutor = new ToolExecutor(cline);
```

### Executing a Single Tool

To execute a single tool, use the `executeTool` method:

```typescript
import { ToolUse } from "../../shared/tools";

const tool: ToolUse = {
  type: "tool_use",
  name: "read_file",
  params: {
    path: "example.txt"
  },
  partial: false
};

const result = await toolExecutor.executeTool(tool);
console.log(result);
```

### Executing Tools Sequentially

To execute tools sequentially, use the `executeToolsSequentially` method or the `executeTools` method with `ToolExecutionMode.SEQUENTIAL`:

```typescript
import { ToolExecutionMode } from "../core/tool-execution/types";

const tools = [
  {
    type: "tool_use",
    name: "read_file",
    params: {
      path: "input.txt"
    },
    partial: false
  },
  {
    type: "tool_use",
    name: "write_to_file",
    params: {
      path: "output.txt",
      content: "Modified content",
      line_count: "1"
    },
    partial: false
  }
];

// Using executeToolsSequentially
const results1 = await toolExecutor.executeToolsSequentially(tools);

// Using executeTools with ToolExecutionMode.SEQUENTIAL
const results2 = await toolExecutor.executeTools(tools, ToolExecutionMode.SEQUENTIAL);
```

### Executing Tools in Parallel

To execute tools in parallel, use the `executeToolsInParallel` method or the `executeTools` method with `ToolExecutionMode.PARALLEL`:

```typescript
const tools = [
  {
    type: "tool_use",
    name: "read_file",
    params: {
      path: "file1.txt"
    },
    partial: false
  },
  {
    type: "tool_use",
    name: "read_file",
    params: {
      path: "file2.txt"
    },
    partial: false
  }
];

// Using executeToolsInParallel
const results1 = await toolExecutor.executeToolsInParallel(tools);

// Using executeTools with ToolExecutionMode.PARALLEL
const results2 = await toolExecutor.executeTools(tools, ToolExecutionMode.PARALLEL);
```

### Executing Tools Conditionally

To execute tools conditionally, use the `executeToolsConditionally` method or the `executeTools` method with `ToolExecutionMode.CONDITIONAL`:

```typescript
const tools = [
  {
    type: "tool_use",
    name: "read_file",
    params: {
      path: "file.txt"
    },
    partial: false
  },
  {
    type: "tool_use",
    name: "write_to_file",
    params: {
      path: "output.txt",
      content: "Condition met",
      line_count: "1"
    },
    partial: false
  }
];

// Using executeToolsConditionally
const results1 = await toolExecutor.executeToolsConditionally(tools);

// Using executeTools with ToolExecutionMode.CONDITIONAL
const results2 = await toolExecutor.executeTools(tools, ToolExecutionMode.CONDITIONAL);
```

### Executing a Composite Tool

To execute a composite tool, use the `executeCompositeTool` method or the `executeTools` method with `ToolExecutionMode.COMPOSITE`:

```typescript
const compositeTool = {
  type: "tool_use",
  name: "composite_tool",
  params: {},
  partial: false,
  tools: [
    {
      type: "tool_use",
      name: "read_file",
      params: {
        path: "input.txt"
      },
      partial: false
    },
    {
      type: "tool_use",
      name: "write_to_file",
      params: {
        path: "output.txt",
        content: "Processed content",
        line_count: "1"
      },
      partial: false
    }
  ],
  mode: ToolExecutionMode.SEQUENTIAL
};

// Using executeCompositeTool
const result1 = await toolExecutor.executeCompositeTool(compositeTool);

// Using executeTools with ToolExecutionMode.COMPOSITE
const result2 = await toolExecutor.executeTools([compositeTool], ToolExecutionMode.COMPOSITE);
```

### Executing a JSON Tool Execution

To execute a JSON tool execution, use the `executeJsonToolExecution` method:

```typescript
const jsonExecution = {
  execution: {
    mode: "sequential",
    tools: [
      {
        name: "read_file",
        params: {
          path: "data.json"
        }
      },
      {
        name: "write_to_file",
        params: {
          path: "output.json",
          content: '{"modified": true}',
          line_count: "1"
        }
      }
    ],
    options: {
      continueOnError: false
    }
  }
};

const results = await toolExecutor.executeJsonToolExecution(jsonExecution);
```

## Execution Modes

The `ToolExecutor` class supports the following execution modes:

### Single Mode

In single mode, only one tool is executed. This is the simplest execution mode and is used when you need to execute a single tool.

### Sequential Mode

In sequential mode, tools are executed one after another in the order they are provided. Each tool can depend on the result of a previous tool using the `dependsOn` property.

### Parallel Mode

In parallel mode, tools are executed concurrently. This is useful when you have multiple independent tools that can be executed at the same time.

### Conditional Mode

In conditional mode, tools are executed based on conditions. Each tool can have a condition that determines whether it should be executed.

### Composite Mode

In composite mode, a single tool contains a sequence of nested tools. The nested tools can be executed in any of the other modes.

## Execution Context

The `ToolExecutor` class manages an execution context that provides:

1. Shared state between tool executions
2. Results of previous tool executions
3. Execution mode
4. Execution options

## Error Handling

The `ToolExecutor` class provides proper error handling for tool executions. If a tool execution fails, the error is captured and returned as part of the result.

## Result Formatting

The `ToolExecutor` class provides a `formatResults` method that formats the results of multiple tool executions into a human-readable string.

## Integration with Enhanced Execution Engine

The `ToolExecutor` class integrates with the enhanced execution engine to provide advanced execution capabilities, such as conditional execution and composite tool execution.

## API Reference

### Constructor

```typescript
constructor(task: Cline)
```

Creates a new `ToolExecutor` instance.

- `task`: A `Cline` instance.

### Methods

#### executeTool

```typescript
async executeTool(tool: AssistantToolUse): Promise<ToolExecutionResult>
```

Executes a single tool.

- `tool`: The tool to execute.
- Returns: A promise that resolves to the tool execution result.

#### executeToolsInParallel

```typescript
async executeToolsInParallel(tools: AssistantToolUse[]): Promise<ToolExecutionResult[]>
```

Executes tools in parallel.

- `tools`: The tools to execute.
- Returns: A promise that resolves to an array of tool execution results.

#### executeToolsSequentially

```typescript
async executeToolsSequentially(tools: AssistantToolUse[]): Promise<ToolExecutionResult[]>
```

Executes tools sequentially, respecting dependencies.

- `tools`: The tools to execute.
- Returns: A promise that resolves to an array of tool execution results.

#### executeToolsConditionally

```typescript
async executeToolsConditionally(tools: AssistantToolUse[], options?: ExecutionOptions): Promise<ToolExecutionResult[]>
```

Executes tools conditionally based on conditions.

- `tools`: The tools to execute.
- `options`: Optional execution options.
- Returns: A promise that resolves to an array of tool execution results.

#### executeCompositeTool

```typescript
async executeCompositeTool(compositeTool: EnhancedToolUse & { tools: EnhancedToolUse[], mode: ToolExecutionMode }, options?: ExecutionOptions): Promise<ToolExecutionResult>
```

Executes a composite tool with nested tools.

- `compositeTool`: The composite tool to execute.
- `options`: Optional execution options.
- Returns: A promise that resolves to the tool execution result.

#### executeJsonToolExecution

```typescript
async executeJsonToolExecution(jsonExecution: JsonToolExecution): Promise<MultiToolExecutionResult>
```

Executes a JSON tool execution.

- `jsonExecution`: The JSON tool execution to execute.
- Returns: A promise that resolves to the multi-tool execution result.

#### formatResults

```typescript
formatResults(mode: ToolExecutionMode, results: ToolExecutionResult[], originalTools: AssistantToolUse[]): string
```

Formats results from multiple tool executions.

- `mode`: The execution mode.
- `results`: The tool execution results.
- `originalTools`: The original tool use objects.
- Returns: A formatted result string.

#### executeTools

```typescript
async executeTools(tools: AssistantToolUse[], mode: ToolExecutionMode, options?: ExecutionOptions): Promise<ToolExecutionResult[]>
```

Executes tools based on the specified mode.

- `tools`: The tools to execute.
- `mode`: The execution mode.
- `options`: Optional execution options.
- Returns: A promise that resolves to an array of tool execution results.
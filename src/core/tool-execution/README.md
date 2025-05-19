# Enhanced Tool Execution Framework

This directory contains the implementation of the enhanced tool execution framework for the Roo-Code VSCode extension. The framework provides a robust architecture for complex tool execution patterns, addressing limitations in the previous implementation.

## Key Components

### 1. JSON-Based Tool Call Format

The framework introduces a JSON-based alternative to the XML format for tool calls, defined in `json-tool-format.ts`. This format provides better support for:

- Nested structures
- Complex execution patterns
- Dependency management
- Error handling

Example JSON format:

```json
{
  "execution": {
    "mode": "sequential",
    "tools": [
      {
        "name": "read_file",
        "toolId": "read_main",
        "params": {
          "path": "src/main.js"
        }
      },
      {
        "name": "write_to_file",
        "toolId": "write_main",
        "dependsOn": "read_main",
        "params": {
          "path": "src/main.js",
          "content": "console.log('Hello, world!');",
          "line_count": 1
        }
      }
    ],
    "options": {
      "continueOnError": false,
      "maxConcurrency": 4
    }
  }
}
```

### 2. Enhanced Execution Engine

The `enhanced-execution-engine.ts` file implements the core execution engine that supports:

- **Sequential Execution**: Execute tools in sequence with dependency management
- **Parallel Execution**: Execute tools concurrently with configurable limits
- **Conditional Execution**: Execute tools based on conditions from previous results
- **Composite Execution**: Compose tools into reusable workflows

### 3. Tool Composition Patterns

The framework supports several tool composition patterns:

- **Pipeline Pattern**: Tools executed in sequence, with each tool's output feeding into the next tool's input
- **Fan-Out/Fan-In Pattern**: A single tool triggers multiple parallel executions, followed by an aggregation step
- **Conditional Branching Pattern**: Execution path determined by the result of a previous tool
- **Retry Pattern**: Failed tool executions are automatically retried with configurable backoff
- **Fallback Pattern**: If a tool fails, an alternative tool is executed instead

### 4. Execution Context

The execution context provides:

- Shared state between tool executions
- Parameter validation and transformation
- Result caching and reuse
- Dependency tracking and resolution
- Error propagation and handling

## Integration with Existing System

The enhanced framework is integrated with the existing tool execution system:

1. The unified parser (`unified-parser.ts`) detects and parses both XML and JSON tool formats
2. The JSON parser (`json-parser.ts`) handles the parsing of JSON tool execution blocks
3. The main tool execution module (`index.ts`) routes tool executions to the appropriate handler

## Usage Guidelines

For most simple tool executions, the XML format remains the recommended approach. The JSON format should be used when:

1. Multiple tools need to be executed with dependencies between them
2. Tools need to be executed conditionally based on previous results
3. Complex error handling or retry logic is required
4. Tools need to share state or transform data between executions

## Future Enhancements

Future enhancements to the framework may include:

1. More sophisticated dependency resolution
2. Enhanced telemetry and monitoring
3. Visual workflow builder for complex tool compositions
4. Integration with event bus for cross-component coordination
5. Support for distributed tool execution
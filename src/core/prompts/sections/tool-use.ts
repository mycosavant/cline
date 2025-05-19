export function getSharedToolUseSection(): string {
	return `====

TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

# Tool Use Formatting

## XML Format (Standard)

Tool uses are formatted using XML-style tags. The tool name itself becomes the XML tag name. Each parameter is enclosed within its own set of tags. Here's the structure:

<actual_tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</actual_tool_name>

For example, to use the read_file tool:

<read_file>
<path>src/main.js</path>
</read_file>

Always use the actual tool name as the XML tag name for proper parsing and execution.

## JSON Format (Enhanced)

For more complex tool execution patterns, you can use the JSON format. This format supports advanced features like sequential and parallel execution, conditional execution, retries, and fallbacks. Here's the structure:

\`\`\`json
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
\`\`\`

The JSON format supports the following execution modes:
- "single": Execute a single tool
- "sequential": Execute tools in sequence, respecting dependencies
- "parallel": Execute tools in parallel
- "conditional": Execute tools based on conditions
- "composite": Execute a composite tool that contains other tools

Each tool can have the following properties:
- "name": The name of the tool (required)
- "toolId": A unique identifier for the tool (optional)
- "dependsOn": The toolId of a tool this tool depends on (optional)
- "params": The parameters for the tool (required)
- "condition": A condition that determines if the tool should execute (for conditional execution)
- "retry": Configuration for retrying the tool if it fails
- "fallback": A fallback tool to execute if this tool fails

For most use cases, the standard XML format is sufficient. Use the JSON format only when you need advanced execution patterns.`
}

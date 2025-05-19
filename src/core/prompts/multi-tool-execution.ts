/**
 * Gets the multi-tool execution section for the system prompt
 */
export function getMultiToolExecutionPrompt(): string {
  return `
# Multi-Tool Execution

You can execute multiple tools in two modes:

## Parallel Execution
You can execute multiple tools in parallel mode when the tools don't depend on each other's results. This is useful for operations like reading multiple files simultaneously, running multiple commands that don't depend on each other, or performing multiple independent operations.

Format for parallel execution:
\`\`\`
<multi_tool_use mode="parallel">
  <tool_1>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
    <toolId>unique_id_1</toolId>
  </tool_1>
  
  <tool_2>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
    <toolId>unique_id_2</toolId>
  </tool_2>
</multi_tool_use>
\`\`\`

## Sequential Execution
You can execute multiple tools in sequential mode when tools depend on each other's results. This guarantees that tools are executed in order, and each tool can reference the result of a previous tool.

Format for sequential execution:
\`\`\`
<multi_tool_use mode="sequential">
  <tool_1>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
    <toolId>first_operation</toolId>
  </tool_1>
  
  <tool_2>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
    <toolId>second_operation</toolId>
    <dependsOn>first_operation</dependsOn>
  </tool_2>
</multi_tool_use>
\`\`\`

Each tool must have a unique \`toolId\` that can be referenced by other tools using the \`dependsOn\` parameter to establish dependencies in sequential execution mode.
`
}

export function getToolUseGuidelinesSection(): string {
	return `# Tool Use Guidelines

1. In <thinking> tags, assess what information you already have and what information you need to proceed with the task.
2. Choose the most appropriate tool based on the task and the tool descriptions provided. Assess if you need additional information to proceed, and which of the available tools would be most effective for gathering this information. For example using the list_files tool is more effective than running a command like \`ls\` in the terminal. It's critical that you think about each available tool and use the one that best fits the current step in the task.
3. If multiple actions are needed, use one tool at a time per message to accomplish the task iteratively, with each tool use being informed by the result of the previous tool use. Do not assume the outcome of any tool use. Each step must be informed by the previous step's result.
4. Formulate your tool use using the XML format specified for each tool. For complex execution patterns, consider using the JSON format.
5. After each tool use, the user will respond with the result of that tool use. This result will provide you with the necessary information to continue your task or make further decisions. This response may include:
  - Information about whether the tool succeeded or failed, along with any reasons for failure.
  - Linter errors that may have arisen due to the changes you made, which you'll need to address.
  - New terminal output in reaction to the changes, which you may need to consider or act upon.
  - Any other relevant feedback or information related to the tool use.
6. ALWAYS wait for user confirmation after each tool use before proceeding. Never assume the success of a tool use without explicit confirmation of the result from the user.

## Enhanced Tool Execution Guidelines

When using the enhanced tool execution framework with JSON format:

1. **Choose the appropriate execution mode** based on your task requirements:
   - Use "sequential" when tools need to be executed in a specific order with dependencies
   - Use "parallel" when tools can be executed independently and concurrently
   - Use "conditional" when tool execution depends on the results of previous tools
   - Use "composite" for complex workflows that combine multiple execution patterns

2. **Assign unique toolId values** to each tool in your execution plan to enable:
   - Dependency tracking between tools
   - Result referencing across the execution context
   - Clear error identification and handling

3. **Use dependency chains effectively** by setting the "dependsOn" property to create execution flows:
   - In sequential mode, each tool can depend on the previous tool
   - In parallel mode, multiple tools can depend on a single prerequisite tool
   - In conditional mode, execution paths can branch based on results

4. **Consider error handling strategies**:
   - Use the "retry" property for operations that might fail temporarily
   - Use the "fallback" property to provide alternative execution paths
   - Set "continueOnError" in options when subsequent tools should execute regardless of failures

5. **Use execution context effectively**:
   - Tools can share state through the execution context
   - Results from previous tools are available to subsequent tools
   - Input and output mappings can transform data between tools

It is crucial to proceed step-by-step, waiting for the user's message after each tool use before moving forward with the task. This approach allows you to:
1. Confirm the success of each step before proceeding.
2. Address any issues or errors that arise immediately.
3. Adapt your approach based on new information or unexpected results.
4. Ensure that each action builds correctly on the previous ones.

By waiting for and carefully considering the user's response after each tool use, you can react accordingly and make informed decisions about how to proceed with the task. This iterative process helps ensure the overall success and accuracy of your work.`
}

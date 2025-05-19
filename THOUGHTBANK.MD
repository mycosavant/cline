Summary of implementation plan:

- Review existing code in roo-code/src/core:
    • tool-use.ts, parse-assistant-message.ts, tool-use-guidelines.ts  
    • Understand current single-tool formatting and parsing

- Refactor parsing logic:
    • Enhance parseToolCallsFromBlock to loop through all `<tool_use>` tags in `<multi_tool_use>` blocks  
    • Correctly manage parsing position (pos) and extraction of toolId, params

- Support multiple execution modes:
    • “parallel” mode: run all tool calls independently  
    • “sequential” mode: add `dependsOn` links between calls in order  
    • Fix default mode and ensure mode is passed through parsing

- Update execution engine:
    • Modify useMcpToolTool.ts / use-mcp-tool.ts to accept arrays of tool calls  
    • Queue calls, respect dependencies, and handle failures by skipping dependent calls

- Improve error handling and testing:
    • Gracefully surface parsing or execution errors  
    • Add unit tests for multi-tool parsing, parallel vs sequential execution, and error cases

- Revise documentation and guidelines:
    • Update tool-use.ts and tool-use-guidelines.ts to describe XML format for multiple tool calls  
    • Provide examples for both parallel and sequential usage  
+-+-+-+-+-+

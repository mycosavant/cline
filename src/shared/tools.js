export const toolParamNames = [
    "command",
    "path",
    "content",
    "line_count",
    "regex",
    "file_pattern",
    "recursive",
    "action",
    "url",
    "coordinate",
    "text",
    "server_name",
    "tool_name",
    "arguments",
    "uri",
    "question",
    "result",
    "diff",
    "start_line",
    "end_line",
    "mode_slug",
    "reason",
    "operations",
    "line",
    "mode",
    "message",
    "cwd",
    "follow_up",
    "task",
    "size",
    "search",
    "replace",
    "use_regex",
    "ignore_case",
    "start_line",
    "end_line",
];
export const TOOL_DISPLAY_NAMES = {
    execute_command: "run commands",
    read_file: "read files",
    fetch_instructions: "fetch instructions",
    write_to_file: "write files",
    apply_diff: "apply changes",
    search_files: "search files",
    list_files: "list files",
    list_code_definition_names: "list definitions",
    browser_action: "use a browser",
    use_mcp_tool: "use mcp tools",
    access_mcp_resource: "access mcp resources",
    ask_followup_question: "ask questions",
    attempt_completion: "complete tasks",
    switch_mode: "switch modes",
    new_task: "create new task",
    insert_content: "insert content",
    search_and_replace: "search and replace",
};
// Define available tool groups.
export const TOOL_GROUPS = {
    read: {
        tools: ["read_file", "fetch_instructions", "search_files", "list_files", "list_code_definition_names"],
    },
    edit: {
        tools: ["apply_diff", "write_to_file", "insert_content", "search_and_replace"],
    },
    browser: {
        tools: ["browser_action"],
    },
    command: {
        tools: ["execute_command"],
    },
    mcp: {
        tools: ["use_mcp_tool", "access_mcp_resource"],
    },
    modes: {
        tools: ["switch_mode", "new_task"],
        alwaysAvailable: true,
    },
};
// Tools that are always available to all modes.
export const ALWAYS_AVAILABLE_TOOLS = [
    "ask_followup_question",
    "attempt_completion",
    "switch_mode",
    "new_task",
];
//# sourceMappingURL=tools.js.map
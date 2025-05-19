import { formatResponse } from "../prompts/responses";
export async function useMcpToolTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag) {
    const server_name = block.params.server_name;
    const tool_name = block.params.tool_name;
    const mcp_arguments = block.params.arguments;
    try {
        if (block.partial) {
            const partialMessage = JSON.stringify({
                type: "use_mcp_tool",
                serverName: removeClosingTag("server_name", server_name),
                toolName: removeClosingTag("tool_name", tool_name),
                arguments: removeClosingTag("arguments", mcp_arguments),
            });
            await cline.ask("use_mcp_server", partialMessage, block.partial).catch(() => { });
            return;
        }
        else {
            if (!server_name) {
                cline.consecutiveMistakeCount++;
                cline.recordToolError("use_mcp_tool");
                pushToolResult(await cline.sayAndCreateMissingParamError("use_mcp_tool", "server_name"));
                return;
            }
            if (!tool_name) {
                cline.consecutiveMistakeCount++;
                cline.recordToolError("use_mcp_tool");
                pushToolResult(await cline.sayAndCreateMissingParamError("use_mcp_tool", "tool_name"));
                return;
            }
            let parsedArguments;
            if (mcp_arguments) {
                try {
                    parsedArguments = JSON.parse(mcp_arguments);
                }
                catch (error) {
                    cline.consecutiveMistakeCount++;
                    cline.recordToolError("use_mcp_tool");
                    await cline.say("error", `Roo tried to use ${tool_name} with an invalid JSON argument. Retrying...`);
                    pushToolResult(formatResponse.toolError(formatResponse.invalidMcpToolArgumentError(server_name, tool_name)));
                    return;
                }
            }
            cline.consecutiveMistakeCount = 0;
            const completeMessage = JSON.stringify({
                type: "use_mcp_tool",
                serverName: server_name,
                toolName: tool_name,
                arguments: mcp_arguments,
            });
            const didApprove = await askApproval("use_mcp_server", completeMessage);
            if (!didApprove) {
                return;
            }
            // Now execute the tool
            await cline.say("mcp_server_request_started"); // same as browser_action_result
            const toolResult = await cline.providerRef
                .deref()
                ?.getMcpHub()
                ?.callTool(server_name, tool_name, parsedArguments);
            // TODO: add progress indicator and ability to parse images and non-text responses
            const toolResultPretty = (toolResult?.isError ? "Error:\n" : "") +
                toolResult?.content
                    .map((item) => {
                    if (item.type === "text") {
                        return item.text;
                    }
                    if (item.type === "resource") {
                        const { blob: _, ...rest } = item.resource;
                        return JSON.stringify(rest, null, 2);
                    }
                    return "";
                })
                    .filter(Boolean)
                    .join("\n\n") || "(No response)";
            await cline.say("mcp_server_response", toolResultPretty);
            pushToolResult(formatResponse.toolResult(toolResultPretty));
            return;
        }
    }
    catch (error) {
        await handleError("executing MCP tool", error);
        return;
    }
}
//# sourceMappingURL=useMcpToolTool.js.map
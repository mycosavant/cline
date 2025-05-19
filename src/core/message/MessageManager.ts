/**
 * Message Manager Module
 * 
 * This module provides a centralized class for handling message parsing and presentation,
 * with special support for tool execution blocks. It serves as the bridge between
 * assistant messages and the tool execution system.
 */

import { Task } from "../task/Task";
import { ToolExecutor } from "../tool-execution/ToolExecutor";
import { ToolExecutionMode, ToolExecutionResult } from "../tool-execution/types";
import { AssistantMessageContent } from "../assistant-message";
import { parseAssistantMessage as parseAssistantMessageUnified } from "../assistant-message/unified-parser";
import { parseJsonToolExecution, processJsonToolExecutionBlock } from "../assistant-message/json-parser";
import { ToolUse, ToolResponse } from "../../shared/tools";
import { ToolName } from "../../schemas";
import { ClineAsk, ToolProgressStatus } from "../../shared/ExtensionMessage";
import { formatResponse } from "../prompts/responses";
import { telemetryService } from "../../services/telemetry/TelemetryService";

/**
 * Interface for message blocks that can be presented to the user
 */
export interface MessageBlock {
  type: 'text' | 'tool_use';
  content?: string;
  name?: ToolName;
  params?: Record<string, any>;
  partial: boolean;
}

/**
 * Interface for tool execution results
 */
export interface ToolExecutionResultWithMetadata extends ToolExecutionResult {
  originalTool: ToolUse;
}

/**
 * MessageManager class for handling message parsing and presentation
 */
export class MessageManager {
  private task: Task;
  private toolExecutor: ToolExecutor;
  private messageContent: AssistantMessageContent[] = [];
  private currentContentIndex: number = 0;
  private didRejectTool: boolean = false;
  private didAlreadyUseTool: boolean = false;
  private presentMessageLocked: boolean = false;
  private presentMessageHasPendingUpdates: boolean = false;

  /**
   * Creates a new MessageManager instance
   * @param task Task instance
   */
  constructor(task: Task) {
    this.task = task;
    this.toolExecutor = new ToolExecutor(task as any); // Cast to Cline as required by ToolExecutor
  }

  /**
   * Parses an assistant message into content blocks
   * @param message Assistant message to parse
   * @returns Array of parsed content blocks
   */
  public parseMessage(message: string): AssistantMessageContent[] {
    // First check for JSON tool execution blocks
    const { jsonExecution, startIndex, endIndex } = parseJsonToolExecution(message);
    
    if (jsonExecution) {
      // Process JSON tool execution block
      return processJsonToolExecutionBlock(message, jsonExecution, startIndex, endIndex);
    }
    
    // Use unified parser for standard message parsing
    return parseAssistantMessageUnified(message);
  }

  /**
   * Updates the message content with new blocks
   * @param content Array of content blocks
   */
  public updateMessageContent(content: AssistantMessageContent[]): void {
    this.messageContent = content;
  }

  /**
   * Appends new content blocks to the existing message content
   * @param content Array of content blocks to append
   */
  public appendMessageContent(content: AssistantMessageContent[]): void {
    this.messageContent = [...this.messageContent, ...content];
  }

  /**
   * Gets the current message content
   * @returns Array of content blocks
   */
  public getMessageContent(): AssistantMessageContent[] {
    return this.messageContent;
  }

  /**
   * Resets the message manager state
   */
  public reset(): void {
    this.messageContent = [];
    this.currentContentIndex = 0;
    this.didRejectTool = false;
    this.didAlreadyUseTool = false;
    this.presentMessageLocked = false;
    this.presentMessageHasPendingUpdates = false;
  }

  /**
   * Collects tool blocks from the message content
   * @param mode Execution mode for the tools
   * @returns Array of tool use blocks
   */
  public collectToolBlocks(mode: ToolExecutionMode = ToolExecutionMode.SINGLE): ToolUse[] {
    return this.messageContent
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        ...block,
        mode
      } as ToolUse));
  }

  /**
   * Collects sequential tool blocks from the message content
   * @returns Array of tool use blocks for sequential execution
   */
  public collectSequentialToolBlocks(): ToolUse[] {
    return this.collectToolBlocks(ToolExecutionMode.SEQUENTIAL);
  }

  /**
   * Collects parallel tool blocks from the message content
   * @returns Array of tool use blocks for parallel execution
   */
  public collectParallelToolBlocks(): ToolUse[] {
    return this.collectToolBlocks(ToolExecutionMode.PARALLEL);
  }

  /**
   * Presents the message content to the user
   * @returns Promise that resolves when presentation is complete
   */
  public async presentMessage(): Promise<void> {
    if (this.task.abort) {
      throw new Error(`[MessageManager#presentMessage] task ${this.task.taskId} aborted`);
    }

    if (this.presentMessageLocked) {
      this.presentMessageHasPendingUpdates = true;
      return;
    }

    this.presentMessageLocked = true;
    this.presentMessageHasPendingUpdates = false;

    if (this.currentContentIndex >= this.messageContent.length) {
      // This may happen if the last content block was completed before
      // streaming could finish. If streaming is finished, and we're out of
      // bounds then this means we already presented/executed the last
      // content block and are ready to continue to next request.
      if (this.task.didCompleteReadingStream) {
        this.task.userMessageContentReady = true;
      }

      this.presentMessageLocked = false;
      return;
    }

    const block = { ...this.messageContent[this.currentContentIndex] }; // Create a copy to avoid reference issues

    try {
      await this.presentContentBlock(block);
    } catch (error) {
      console.error("Error presenting content block:", error);
    }

    // Handle file checkpointing if needed
    const recentlyModifiedFiles = this.task.fileContextTracker.getAndClearCheckpointPossibleFile();
    if (recentlyModifiedFiles.length > 0) {
      await this.task.checkpointSave();
    }

    this.presentMessageLocked = false;

    // Move to next block if current block is complete
    if (!block.partial || this.didRejectTool || this.didAlreadyUseTool) {
      this.currentContentIndex++;

      // If we've processed all blocks and streaming is complete, mark message as ready
      if (this.currentContentIndex >= this.messageContent.length && this.task.didCompleteReadingStream) {
        this.task.userMessageContentReady = true;
      }
    }

    // If there are pending updates, present them
    if (this.presentMessageHasPendingUpdates) {
      await this.presentMessage();
    }
  }

  /**
   * Presents a single content block to the user
   * @param block Content block to present
   */
  private async presentContentBlock(block: AssistantMessageContent): Promise<void> {
    switch (block.type) {
      case "text":
        await this.presentTextBlock(block);
        break;
      case "tool_use":
        await this.presentToolUseBlock(block);
        break;
    }
  }

  /**
   * Presents a text block to the user
   * @param block Text block to present
   */
  private async presentTextBlock(block: AssistantMessageContent & { type: "text" }): Promise<void> {
    if (this.didRejectTool || this.didAlreadyUseTool) {
      return;
    }

    let content = block.content;

    if (content) {
      // Remove thinking tags
      content = content.replace(/<thinking>\s?/g, "");
      content = content.replace(/\s?<\/thinking>/g, "");

      // Remove partial XML tag at the end
      const lastOpenBracketIndex = content.lastIndexOf("<");
      if (lastOpenBracketIndex !== -1) {
        const possibleTag = content.slice(lastOpenBracketIndex);
        const hasCloseBracket = possibleTag.includes(">");

        if (!hasCloseBracket) {
          let tagContent: string;
          if (possibleTag.startsWith("</")) {
            tagContent = possibleTag.slice(2).trim();
          } else {
            tagContent = possibleTag.slice(1).trim();
          }

          const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent);
          const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</";

          if (isOpeningOrClosing || isLikelyTagName) {
            content = content.slice(0, lastOpenBracketIndex).trim();
          }
        }
      }
    }

    await this.task.say("text", content, undefined, block.partial);
  }

  /**
   * Presents a tool use block to the user
   * @param block Tool use block to present
   */
  private async presentToolUseBlock(block: AssistantMessageContent & { type: "tool_use" }): Promise<void> {
    const toolDescription = this.getToolDescription(block);

    if (this.didRejectTool) {
      // Ignore any tool content after user has rejected tool once
      if (!block.partial) {
        this.task.userMessageContent.push({
          type: "text",
          text: `Skipping tool ${toolDescription} due to user rejecting a previous tool.`
        });
      } else {
        this.task.userMessageContent.push({
          type: "text",
          text: `Tool ${toolDescription} was interrupted and not executed due to user rejecting a previous tool.`
        });
      }
      return;
    }

    if (this.didAlreadyUseTool) {
      // Ignore any content after a tool has already been used
      this.task.userMessageContent.push({
        type: "text",
        text: `Tool [${block.name}] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.`
      });
      return;
    }

    // Execute the tool
    try {
      await this.executeTool(block);
      this.didAlreadyUseTool = true;
    } catch (error) {
      console.error("Error executing tool:", error);
      await this.task.say("error", `Error executing tool ${block.name}: ${error.message}`);
    }
  }

  /**
   * Executes a tool and handles the result
   * @param tool Tool to execute
   * @returns Promise with tool execution result
   */
  private async executeTool(tool: ToolUse): Promise<ToolExecutionResult> {
    // Record tool usage
    this.task.recordToolUsage(tool.name as ToolName);
    telemetryService.captureToolUsage(this.task.taskId, tool.name as ToolName);

    // Execute the tool using the ToolExecutor
    // The ToolExecutor will handle all the necessary callbacks internally
    return await this.toolExecutor.executeTool(tool);
  }

  /**
   * Creates a handler for asking user approval
   * @param tool Tool being executed
   * @returns Ask approval handler function
   */
  private createAskApprovalHandler(tool: ToolUse): (type: ClineAsk, partialMessage?: string, progressStatus?: ToolProgressStatus) => Promise<boolean> {
    const toolDescription = this.getToolDescription(tool);
    
    return async (type: ClineAsk, partialMessage?: string, progressStatus?: ToolProgressStatus) => {
      const { response, text, images } = await this.task.ask(type, partialMessage, false, progressStatus);
      
      if (response !== "yesButtonClicked") {
        // Handle both messageResponse and noButtonClicked with text
        if (text) {
          await this.task.say("user_feedback", text, images);
          this.task.userMessageContent.push({ 
            type: "text", 
            text: `${toolDescription} Result: ${formatResponse.toolDeniedWithFeedback(text)}` 
          });
          if (images && images.length > 0) {
            this.task.userMessageContent.push(...formatResponse.imageBlocks(images));
          }
        } else {
          this.task.userMessageContent.push({ 
            type: "text", 
            text: `${toolDescription} Result: ${formatResponse.toolDenied()}` 
          });
        }
        
        this.didRejectTool = true;
        return false;
      }
      
      // Handle yesButtonClicked with text
      if (text) {
        await this.task.say("user_feedback", text, images);
        this.task.userMessageContent.push({ 
          type: "text", 
          text: `${toolDescription} Result: ${formatResponse.toolApprovedWithFeedback(text)}` 
        });
        if (images && images.length > 0) {
          this.task.userMessageContent.push(...formatResponse.imageBlocks(images));
        }
      }
      
      return true;
    };
  }

  /**
   * Creates a handler for tool errors
   * @param tool Tool being executed
   * @returns Error handler function
   */
  private createErrorHandler(tool: ToolUse): (action: string, error: Error) => Promise<void> {
    const toolDescription = this.getToolDescription(tool);
    
    return async (action: string, error: Error) => {
      const errorMessage = `Error ${action}: ${error.message || JSON.stringify(error)}`;
      
      await this.task.say("error", errorMessage);
      
      this.task.userMessageContent.push({ 
        type: "text", 
        text: `${toolDescription} Result: ${formatResponse.toolError(errorMessage)}` 
      });
    };
  }

  /**
   * Creates a handler for pushing tool results
   * @param tool Tool being executed
   * @returns Push tool result handler function
   */
  private createPushToolResultHandler(tool: ToolUse): (content: ToolResponse) => void {
    const toolDescription = this.getToolDescription(tool);
    
    return (content: ToolResponse) => {
      this.task.userMessageContent.push({ type: "text", text: `${toolDescription} Result:` });
      
      if (typeof content === "string") {
        this.task.userMessageContent.push({ 
          type: "text", 
          text: content || "(tool did not return anything)" 
        });
      } else {
        this.task.userMessageContent.push(...content);
      }
      
      this.didAlreadyUseTool = true;
    };
  }

  /**
   * Creates a handler for removing closing tags
   * @returns Remove closing tag handler function
   */
  private createRemoveClosingTagHandler(): (tag: string, content?: string) => string {
    return (tag: string, content?: string) => {
      if (!content) {
        return "";
      }
      
      // This regex dynamically constructs a pattern to match the closing tag
      const tagRegex = new RegExp(
        `\\s?<\/?${tag
          .split("")
          .map((char) => `(?:${char})?`)
          .join("")}$`,
        "g"
      );
      
      return content.replace(tagRegex, "");
    };
  }

  /**
   * Gets a description of a tool for display purposes
   * @param tool Tool to describe
   * @returns Tool description string
   */
  private getToolDescription(tool: ToolUse): string {
    switch (tool.name) {
      case "execute_command":
        return `[${tool.name} for '${tool.params.command}']`;
      case "read_file":
        return `[${tool.name} for '${tool.params.path}']`;
      case "fetch_instructions":
        return `[${tool.name} for '${tool.params.task}']`;
      case "write_to_file":
        return `[${tool.name} for '${tool.params.path}']`;
      case "apply_diff":
        return `[${tool.name} for '${tool.params.path}']`;
      case "search_files":
        return `[${tool.name} for '${tool.params.regex}'${
          tool.params.file_pattern ? ` in '${tool.params.file_pattern}'` : ""
        }]`;
      case "insert_content":
        return `[${tool.name} for '${tool.params.path}']`;
      case "search_and_replace":
        return `[${tool.name} for '${tool.params.path}']`;
      case "list_files":
        return `[${tool.name} for '${tool.params.path}']`;
      case "list_code_definition_names":
        return `[${tool.name} for '${tool.params.path}']`;
      case "browser_action":
        return `[${tool.name} for '${tool.params.action}']`;
      case "use_mcp_tool":
        return `[${tool.name} for '${tool.params.server_name}']`;
      case "access_mcp_resource":
        return `[${tool.name} for '${tool.params.server_name}']`;
      case "ask_followup_question":
        return `[${tool.name} for '${tool.params.question}']`;
      case "attempt_completion":
        return `[${tool.name}]`;
      case "switch_mode":
        return `[${tool.name} to '${tool.params.mode_slug}'${tool.params.reason ? ` because: ${tool.params.reason}` : ""}]`;
      case "new_task": {
        const mode = tool.params.mode || "code";
        const message = tool.params.message || "(no message)";
        return `[${tool.name} in ${mode} mode: '${message}']`;
      }
      default:
        return `[${tool.name}]`;
    }
  }

  /**
   * Executes multiple tools in parallel
   * @param tools Array of tools to execute
   * @returns Promise with array of tool execution results
   */
  public async executeToolsInParallel(tools: ToolUse[]): Promise<ToolExecutionResult[]> {
    return this.toolExecutor.executeToolsInParallel(tools);
  }

  /**
   * Executes multiple tools sequentially
   * @param tools Array of tools to execute
   * @returns Promise with array of tool execution results
   */
  public async executeToolsSequentially(tools: ToolUse[]): Promise<ToolExecutionResult[]> {
    return this.toolExecutor.executeToolsSequentially(tools);
  }

  /**
   * Executes tools based on the specified mode
   * @param tools Array of tools to execute
   * @param mode Execution mode
   * @returns Promise with array of tool execution results
   */
  public async executeTools(tools: ToolUse[], mode: ToolExecutionMode): Promise<ToolExecutionResult[]> {
    return this.toolExecutor.executeTools(tools, mode);
  }
}
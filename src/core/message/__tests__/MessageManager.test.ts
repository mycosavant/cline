/**
 * Unit tests for the MessageManager class
 */

import { MessageManager } from '../MessageManager';
import { ToolExecutionMode } from '../../tool-execution/types';
import { AssistantMessageContent } from '../../assistant-message';
import { ToolName } from '../../../schemas';
import { ToolUse } from '../../../shared/tools';
import { EnhancedToolUse } from '../../tool-execution/types';

// Mock dependencies
jest.mock('../../task/Task');
jest.mock('../../tool-execution/ToolExecutor');
jest.mock('../../assistant-message/unified-parser');
jest.mock('../../assistant-message/json-parser');
jest.mock('../../../services/telemetry/TelemetryService', () => ({
  telemetryService: {
    captureToolUsage: jest.fn()
  }
}));

describe('MessageManager', () => {
  let messageManager: MessageManager;
  let mockTask: any;
  let mockToolExecutor: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock task
    mockTask = {
      taskId: 'test-task-id',
      abort: false,
      say: jest.fn().mockResolvedValue(undefined),
      ask: jest.fn().mockResolvedValue({ response: 'yesButtonClicked' }),
      userMessageContent: [],
      fileContextTracker: {
        getAndClearCheckpointPossibleFile: jest.fn().mockReturnValue([])
      },
      checkpointSave: jest.fn().mockResolvedValue(undefined),
      recordToolUsage: jest.fn()
    };
    
    // Create message manager instance
    messageManager = new MessageManager(mockTask);
    
    // Mock the toolExecutor property
    mockToolExecutor = {
      executeTool: jest.fn().mockResolvedValue({ toolId: 'test-tool', result: 'Test result' }),
      executeToolsInParallel: jest.fn().mockResolvedValue([{ toolId: 'test-tool-1', result: 'Test result 1' }]),
      executeToolsSequentially: jest.fn().mockResolvedValue([{ toolId: 'test-tool-2', result: 'Test result 2' }]),
      executeTools: jest.fn().mockResolvedValue([{ toolId: 'test-tool-3', result: 'Test result 3' }])
    };
    (messageManager as any).toolExecutor = mockToolExecutor;
  });

  describe('parseMessage', () => {
    it('should use JSON parser when JSON tool execution is detected', () => {
      // Mock dependencies
      const mockJsonExecution = { execution: { mode: 'sequential', tools: [] } };
      const mockParseJsonToolExecution = require('../../assistant-message/json-parser').parseJsonToolExecution;
      mockParseJsonToolExecution.mockReturnValue({
        jsonExecution: mockJsonExecution,
        startIndex: 0,
        endIndex: 100
      });
      
      const mockProcessJsonToolExecutionBlock = require('../../assistant-message/json-parser').processJsonToolExecutionBlock;
      const expectedBlocks = [{ type: 'text', content: 'Test content', partial: false }];
      mockProcessJsonToolExecutionBlock.mockReturnValue(expectedBlocks);
      
      // Call the method
      const result = messageManager.parseMessage('```json\n{"execution":{"mode":"sequential","tools":[]}}\n```');
      
      // Verify results
      expect(mockParseJsonToolExecution).toHaveBeenCalledWith('```json\n{"execution":{"mode":"sequential","tools":[]}}\n```');
      expect(mockProcessJsonToolExecutionBlock).toHaveBeenCalledWith(
        '```json\n{"execution":{"mode":"sequential","tools":[]}}\n```',
        mockJsonExecution,
        0,
        100
      );
      expect(result).toEqual(expectedBlocks);
    });
    
    it('should use unified parser when no JSON tool execution is detected', () => {
      // Mock dependencies
      const mockParseJsonToolExecution = require('../../assistant-message/json-parser').parseJsonToolExecution;
      mockParseJsonToolExecution.mockReturnValue({
        jsonExecution: null,
        startIndex: -1,
        endIndex: -1
      });
      
      const mockParseAssistantMessageUnified = require('../../assistant-message/unified-parser').parseAssistantMessage;
      const expectedBlocks = [{ type: 'text', content: 'Test content', partial: false }];
      mockParseAssistantMessageUnified.mockReturnValue(expectedBlocks);
      
      // Call the method
      const result = messageManager.parseMessage('Test message');
      
      // Verify results
      expect(mockParseJsonToolExecution).toHaveBeenCalledWith('Test message');
      expect(mockParseAssistantMessageUnified).toHaveBeenCalledWith('Test message');
      expect(result).toEqual(expectedBlocks);
    });
  });

  describe('updateMessageContent', () => {
    it('should update the message content', () => {
      const content: AssistantMessageContent[] = [
        { type: 'text', content: 'Test content', partial: false }
      ];
      
      messageManager.updateMessageContent(content);
      
      expect(messageManager.getMessageContent()).toEqual(content);
    });
  });

  describe('appendMessageContent', () => {
    it('should append content to existing message content', () => {
      const initialContent: AssistantMessageContent[] = [
        { type: 'text', content: 'Initial content', partial: false }
      ];
      
      const additionalContent: AssistantMessageContent[] = [
        { type: 'text', content: 'Additional content', partial: false }
      ];
      
      messageManager.updateMessageContent(initialContent);
      messageManager.appendMessageContent(additionalContent);
      
      expect(messageManager.getMessageContent()).toEqual([...initialContent, ...additionalContent]);
    });
  });

  describe('reset', () => {
    it('should reset the message manager state', () => {
      // Setup initial state
      const content: AssistantMessageContent[] = [
        { type: 'text', content: 'Test content', partial: false }
      ];
      
      messageManager.updateMessageContent(content);
      (messageManager as any).currentContentIndex = 1;
      (messageManager as any).didRejectTool = true;
      (messageManager as any).didAlreadyUseTool = true;
      (messageManager as any).presentMessageLocked = true;
      (messageManager as any).presentMessageHasPendingUpdates = true;
      
      // Reset
      messageManager.reset();
      
      // Verify state is reset
      expect(messageManager.getMessageContent()).toEqual([]);
      expect((messageManager as any).currentContentIndex).toBe(0);
      expect((messageManager as any).didRejectTool).toBe(false);
      expect((messageManager as any).didAlreadyUseTool).toBe(false);
      expect((messageManager as any).presentMessageLocked).toBe(false);
      expect((messageManager as any).presentMessageHasPendingUpdates).toBe(false);
    });
  });

  describe('collectToolBlocks', () => {
    it('should collect tool blocks with specified mode', () => {
      // Setup message content with mixed blocks
      const content: AssistantMessageContent[] = [
        { type: 'text', content: 'Text before tools', partial: false },
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false } as ToolUse,
        { type: 'text', content: 'Text between tools', partial: false },
        { type: 'tool_use', name: 'write_to_file' as ToolName, params: { path: 'output.txt', content: 'Test content' }, partial: false } as ToolUse
      ];
      
      messageManager.updateMessageContent(content);
      
      // Collect tool blocks with custom mode
      const toolBlocks = messageManager.collectToolBlocks(ToolExecutionMode.PARALLEL);
      
      // Verify results
      expect(toolBlocks).toHaveLength(2);
      expect(toolBlocks[0].name).toBe('read_file');
      expect((toolBlocks[0] as EnhancedToolUse).mode).toBe(ToolExecutionMode.PARALLEL);
      expect(toolBlocks[1].name).toBe('write_to_file');
      expect((toolBlocks[1] as EnhancedToolUse).mode).toBe(ToolExecutionMode.PARALLEL);
    });
    
    it('should use SINGLE mode by default', () => {
      // Setup message content with tool blocks
      const content: AssistantMessageContent[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false } as ToolUse
      ];
      
      messageManager.updateMessageContent(content);
      
      // Collect tool blocks with default mode
      const toolBlocks = messageManager.collectToolBlocks();
      
      // Verify results
      expect(toolBlocks).toHaveLength(1);
      expect((toolBlocks[0] as EnhancedToolUse).mode).toBe(ToolExecutionMode.SINGLE);
    });
  });

  describe('collectSequentialToolBlocks', () => {
    it('should collect tool blocks with SEQUENTIAL mode', () => {
      // Setup message content with tool blocks
      const content: AssistantMessageContent[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false } as ToolUse
      ];
      
      messageManager.updateMessageContent(content);
      
      // Collect sequential tool blocks
      const toolBlocks = messageManager.collectSequentialToolBlocks();
      
      // Verify results
      expect(toolBlocks).toHaveLength(1);
      expect((toolBlocks[0] as EnhancedToolUse).mode).toBe(ToolExecutionMode.SEQUENTIAL);
    });
  });

  describe('collectParallelToolBlocks', () => {
    it('should collect tool blocks with PARALLEL mode', () => {
      // Setup message content with tool blocks
      const content: AssistantMessageContent[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false } as ToolUse
      ];
      
      messageManager.updateMessageContent(content);
      
      // Collect parallel tool blocks
      const toolBlocks = messageManager.collectParallelToolBlocks();
      
      // Verify results
      expect(toolBlocks).toHaveLength(1);
      expect((toolBlocks[0] as EnhancedToolUse).mode).toBe(ToolExecutionMode.PARALLEL);
    });
  });

  describe('executeTools', () => {
    it('should delegate to toolExecutor.executeTools', async () => {
      // Setup tool blocks
      const tools: ToolUse[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false }
      ];
      
      // Execute tools
      await messageManager.executeTools(tools, ToolExecutionMode.SEQUENTIAL);
      
      // Verify toolExecutor was called correctly
      expect(mockToolExecutor.executeTools).toHaveBeenCalledWith(tools, ToolExecutionMode.SEQUENTIAL);
    });
  });

  describe('executeToolsInParallel', () => {
    it('should delegate to toolExecutor.executeToolsInParallel', async () => {
      // Setup tool blocks
      const tools: ToolUse[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false }
      ];
      
      // Execute tools in parallel
      await messageManager.executeToolsInParallel(tools);
      
      // Verify toolExecutor was called correctly
      expect(mockToolExecutor.executeToolsInParallel).toHaveBeenCalledWith(tools);
    });
  });

  describe('executeToolsSequentially', () => {
    it('should delegate to toolExecutor.executeToolsSequentially', async () => {
      // Setup tool blocks
      const tools: ToolUse[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false }
      ];
      
      // Execute tools sequentially
      await messageManager.executeToolsSequentially(tools);
      
      // Verify toolExecutor was called correctly
      expect(mockToolExecutor.executeToolsSequentially).toHaveBeenCalledWith(tools);
    });
  });

  describe('getToolDescription', () => {
    it('should return appropriate description for different tool types', () => {
      // Test various tool descriptions
      const tools: ToolUse[] = [
        { type: 'tool_use', name: 'read_file' as ToolName, params: { path: 'test.txt' }, partial: false },
        { type: 'tool_use', name: 'write_to_file' as ToolName, params: { path: 'output.txt' }, partial: false },
        { type: 'tool_use', name: 'search_files' as ToolName, params: { regex: 'pattern', file_pattern: '*.ts' }, partial: false },
        { type: 'tool_use', name: 'attempt_completion' as ToolName, params: {}, partial: false },
        { type: 'tool_use', name: 'new_task' as ToolName, params: { mode: 'code', message: 'Create a file' }, partial: false }
      ];
      
      // Verify descriptions
      expect((messageManager as any).getToolDescription(tools[0])).toBe('[read_file for \'test.txt\']');
      expect((messageManager as any).getToolDescription(tools[1])).toBe('[write_to_file for \'output.txt\']');
      expect((messageManager as any).getToolDescription(tools[2])).toBe('[search_files for \'pattern\' in \'*.ts\']');
      expect((messageManager as any).getToolDescription(tools[3])).toBe('[attempt_completion]');
      expect((messageManager as any).getToolDescription(tools[4])).toBe('[new_task in code mode: \'Create a file\']');
    });
  });
});
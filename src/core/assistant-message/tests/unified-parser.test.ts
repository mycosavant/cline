import { parseAssistantMessage, ParsedToolUse } from '../unified-parser';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid for consistent test results
jest.mock('uuid');
const mockUuid = '12345678-1234-1234-1234-123456789012';
(uuidv4 as jest.Mock).mockReturnValue(mockUuid);

describe('Unified Parser', () => {
  describe('Single Tool Parsing', () => {
    it('should parse a simple tool use', () => {
      const message = `<read_file>
<path>src/main.js</path>
</read_file>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: false,
        mode: 'single',
        toolId: mockUuid
      });
    });
    
    it('should parse text and tool use mixed content', () => {
      const message = `Here's how to read a file:

<read_file>
<path>src/main.js</path>
</read_file>

This will read the file.`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'text',
        content: "Here's how to read a file:",
        partial: false
      });
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: false,
        mode: 'single',
        toolId: mockUuid
      });
      expect(result[2]).toEqual({
        type: 'text',
        content: 'This will read the file.',
        partial: false
      });
    });
    
    it('should handle partial tool use', () => {
      const message = `<read_file>
<path>src/main.js`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: true,
        mode: 'single',
        toolId: mockUuid
      });
    });
    
    it('should handle special case for write_to_file content parameter', () => {
      // Test for write_to_file content parameter handling
      const writeFileMessage = `<write_to_file>
<path>src/main.js</path>
<content>
function main() {
  console.log("Hello, world!");
  // This has a </content> tag inside it
  return 0;
}`;
      
      const writeFileResult = parseAssistantMessage(writeFileMessage);
      
      expect(writeFileResult).toHaveLength(1);
      expect(writeFileResult[0].type).toBe('tool_use');
      expect((writeFileResult[0] as ParsedToolUse).name).toBe('write_to_file');
      expect((writeFileResult[0] as ParsedToolUse).params.path).toBe('src/main.js');
      expect((writeFileResult[0] as ParsedToolUse).params.content).toBe(`function main() {
  console.log("Hello, world!");
  // This has a </content> tag inside it
  return 0;
}`);
      expect((writeFileResult[0] as ParsedToolUse).params.line_count).toBe('7');
    });
  });
  
  describe('Multi-Tool Parsing - Parallel Mode', () => {
    it('should parse parallel execution blocks with modern format', () => {
      const message = `<multi_tool_use mode="parallel">
  <read_file>
    <path>src/main.js</path>
    <toolId>read_main</toolId>
  </read_file>
  
  <read_file>
    <path>src/utils.js</path>
    <toolId>read_utils</toolId>
  </read_file>
</multi_tool_use>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: false,
        mode: 'parallel',
        toolId: 'read_main'
      });
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/utils.js'
        },
        partial: false,
        mode: 'parallel',
        toolId: 'read_utils'
      });
    });
    
    it('should parse parallel execution blocks with legacy format', () => {
      const message = `<parallel>
  <read_file>
    <path>src/main.js</path>
    <toolId>read_main</toolId>
  </read_file>
  
  <read_file>
    <path>src/utils.js</path>
    <toolId>read_utils</toolId>
  </read_file>
</parallel>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: false,
        mode: 'parallel',
        toolId: 'read_main'
      });
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/utils.js'
        },
        partial: false,
        mode: 'parallel',
        toolId: 'read_utils'
      });
    });
  });
  
  describe('Multi-Tool Parsing - Sequential Mode', () => {
    it('should parse sequential execution blocks with modern format', () => {
      const message = `<multi_tool_use mode="sequential">
  <read_file>
    <path>src/main.js</path>
    <toolId>read_main</toolId>
  </read_file>
  
  <write_to_file>
    <path>src/main.js</path>
    <content>console.log("Hello, world!");</content>
    <line_count>1</line_count>
    <toolId>write_main</toolId>
    <dependsOn>read_main</dependsOn>
  </write_to_file>
</multi_tool_use>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'tool_use',
        name: 'read_file',
        params: {
          path: 'src/main.js'
        },
        partial: false,
        mode: 'sequential',
        toolId: 'read_main'
      });
      expect(result[1]).toEqual({
        type: 'tool_use',
        name: 'write_to_file',
        params: {
          path: 'src/main.js',
          content: 'console.log("Hello, world!");',
          line_count: '1'
        },
        partial: false,
        mode: 'sequential',
        toolId: 'write_main',
        dependsOn: 'read_main'
      });
    });
    
    it('should handle automatic dependency chain in sequential mode', () => {
      const message = `<multi_tool_use mode="sequential">
  <read_file>
    <path>src/main.js</path>
    <toolId>read_main</toolId>
  </read_file>
  
  <write_to_file>
    <path>src/main.js</path>
    <content>console.log("Hello, world!");</content>
    <line_count>1</line_count>
    <toolId>write_main</toolId>
  </write_to_file>
</multi_tool_use>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(2);
      expect((result[0] as ParsedToolUse).toolId).toBe('read_main');
      expect((result[1] as ParsedToolUse).toolId).toBe('write_main');
      expect((result[1] as ParsedToolUse).dependsOn).toBe('read_main');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle malformed XML tags', () => {
      const message = `<read_file>
<path>src/main.js</path>
<invalid_tag>value</invalid_tag>
</read_file>`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tool_use');
      expect((result[0] as ParsedToolUse).name).toBe('read_file');
      expect((result[0] as ParsedToolUse).params.path).toBe('src/main.js');
      // Check that invalid tags are ignored - using any to bypass type checking
      expect((result[0] as any).params.invalid_tag).toBeUndefined();
    });
    
    it('should handle missing closing tags', () => {
      const message = `<read_file>
<path>src/main.js`;
      
      const result = parseAssistantMessage(message);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tool_use');
      expect((result[0] as ParsedToolUse).name).toBe('read_file');
      expect((result[0] as ParsedToolUse).params.path).toBe('src/main.js');
      expect((result[0] as ParsedToolUse).partial).toBe(true);
    });
  });
});
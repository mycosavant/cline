# Assistant Message Parsing

This directory contains the implementation of the assistant message parsing logic for the Roo-Code VSCode extension.

## Files

- `parseAssistantMessage.ts` - Original implementation for parsing assistant messages
- `parse-assistant-message.ts` - Newer implementation with multi-tool execution block support
- `parse-assistant-message-new.ts` - Improved implementation with better error handling
- `parseAssistantMessageV2.ts` - Efficiency-focused implementation
- `unified-parser.ts` - Unified implementation that combines the strengths of all previous parsers

## Unified Parser

The unified parser (`unified-parser.ts`) is the recommended implementation for parsing assistant messages. It provides:

1. **Robust Multi-Tool Execution Support**
   - Parallel execution mode for independent tools
   - Sequential execution mode with dependency chain management
   - Support for both modern and legacy format tags

2. **Enhanced Error Handling**
   - Comprehensive validation of XML tags
   - Proper handling of malformed input
   - Detailed error reporting

3. **Dependency Chain Management**
   - Validation of toolId parameters
   - Proper handling of dependsOn references
   - Detection and resolution of circular dependencies

4. **Performance Optimizations**
   - Efficient parsing of large messages
   - Reduced memory usage
   - Improved parsing speed

## Usage

```typescript
import { parseAssistantMessageUnified } from "./core/assistant-message"

// Parse an assistant message
const contentBlocks = parseAssistantMessageUnified(assistantMessage)

// Process the content blocks
for (const block of contentBlocks) {
  if (block.type === "text") {
    // Handle text content
    console.log(block.content)
  } else if (block.type === "tool_use") {
    // Handle tool use
    console.log(block.name, block.params)
  }
}
```

## Multi-Tool Execution Format

### Parallel Execution

```
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
```

### Sequential Execution

```
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
```

## Legacy Format Support

The unified parser also supports the legacy format for multi-tool execution:

### Parallel Execution (Legacy)

```
<parallel>
  <tool_1>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
  </tool_1>
  
  <tool_2>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
  </tool_2>
</parallel>
```

### Sequential Execution (Legacy)

```
<sequential>
  <tool_1>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
  </tool_1>
  
  <tool_2>
    <parameter1_name>value1</parameter1_name>
    <parameter2_name>value2</parameter2_name>
  </tool_2>
</sequential>
```

## Implementation Notes

- The unified parser automatically generates UUIDs for tools that don't have explicit toolId parameters
- In sequential mode, if dependencies aren't explicitly specified, the parser sets up a default chain where each tool depends on the previous one
- The parser validates all toolIds to ensure they are unique
- The parser checks for circular dependencies and resolves them by removing the dependency
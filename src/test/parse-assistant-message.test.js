import * as assert from 'assert';
import { parseAssistantMessage } from '../core/assistant-message';
describe('parseAssistantMessage with multi-tool execution', () => {
    it('should parse parallel tool execution correctly', () => {
        const message = `I'll read multiple files in parallel to compare them.

<multi_tool_use mode="parallel">
<read_file>
<path>src/first-file.js</path>
<toolId>first_file</toolId>
</read_file>

<read_file>
<path>src/second-file.js</path>
<toolId>second_file</toolId>
</read_file>
</multi_tool_use>

Now let's compare both files.`;
        const result = parseAssistantMessage(message);
        // The result should have 3 blocks: text, first tool, second tool, text
        assert.strictEqual(result.length, 3);
        // The first block should be text
        assert.strictEqual(result[0].type, 'text');
        // The next two blocks should be tool_use with parallel mode
        assert.strictEqual(result[1].type, 'tool_use');
        assert.strictEqual(result[1].mode, 'parallel');
        assert.strictEqual(result[1].name, 'read_file');
        assert.strictEqual(result[1].params.path, 'src/first-file.js');
        assert.strictEqual(result[1].toolId, 'first_file');
        assert.strictEqual(result[2].type, 'tool_use');
        assert.strictEqual(result[2].mode, 'parallel');
        assert.strictEqual(result[2].name, 'read_file');
        assert.strictEqual(result[2].params.path, 'src/second-file.js');
        assert.strictEqual(result[2].toolId, 'second_file');
    });
    it('should parse sequential tool execution correctly', () => {
        const message = `I'll process files sequentially to transform data.

<multi_tool_use mode="sequential">
<read_file>
<path>src/input.json</path>
<toolId>read_input</toolId>
</read_file>

<write_to_file>
<path>src/output.json</path>
<content>{ "processed": true }</content>
<toolId>write_output</toolId>
<dependsOn>read_input</dependsOn>
</write_to_file>
</multi_tool_use>

Now the data has been processed.`;
        const result = parseAssistantMessage(message);
        // The result should have 3 blocks: text, first tool, second tool, text
        assert.strictEqual(result.length, 3);
        // The first block should be text
        assert.strictEqual(result[0].type, 'text');
        // The next two blocks should be tool_use with sequential mode
        assert.strictEqual(result[1].type, 'tool_use');
        assert.strictEqual(result[1].mode, 'sequential');
        assert.strictEqual(result[1].name, 'read_file');
        assert.strictEqual(result[1].params.path, 'src/input.json');
        assert.strictEqual(result[1].toolId, 'read_input');
        assert.strictEqual(result[2].type, 'tool_use');
        assert.strictEqual(result[2].mode, 'sequential');
        assert.strictEqual(result[2].name, 'write_to_file');
        assert.strictEqual(result[2].params.path, 'src/output.json');
        assert.strictEqual(result[2].params.content, '{ "processed": true }');
        assert.strictEqual(result[2].toolId, 'write_output');
        assert.strictEqual(result[2].dependsOn, 'read_input');
    });
    it('should parse single tool execution correctly', () => {
        const message = `I'll execute a single command.

<execute_command>
<command>ls -la</command>
<requires_approval>false</requires_approval>
</execute_command>

Let's see the results.`;
        const result = parseAssistantMessage(message);
        // The result should have 3 blocks: text, tool, text
        assert.strictEqual(result.length, 3);
        // The first block should be text
        assert.strictEqual(result[0].type, 'text');
        // The next block should be tool_use with single mode (undefined)
        assert.strictEqual(result[1].type, 'tool_use');
        assert.strictEqual(result[1].mode, undefined);
        assert.strictEqual(result[1].name, 'execute_command');
        assert.strictEqual(result[1].params.command, 'ls -la');
        assert.strictEqual(result[1].params.requires_approval, 'false');
        // The last block should be text
        assert.strictEqual(result[2].type, 'text');
    });
});
//# sourceMappingURL=parse-assistant-message.test.js.map
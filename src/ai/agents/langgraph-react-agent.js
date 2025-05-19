// npm install @langchain-anthropic @langchain/vscode @langchain/core
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { documentCodebase } from "../../core/prompts/system";
import { exec } from "child_process";
import util from "util";
import * as fs from 'fs';
import * as path from 'path';
import { z } from "zod";
const execAsync = util.promisify(exec);
// Tool to install node packages
const installNodePackages = tool(async ({ command }) => {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            return `Error installing packages: ${stderr}`;
        }
        return `Successfully installed packages: ${stdout}`;
    }
    catch (error) {
        return `Error installing packages: ${error}`;
    }
}, {
    name: "install_node_packages",
    description: "Installs node packages using a terminal run command, such as npm install or yarn add",
    schema: z.object({
        command: z.string().describe("The command to run in the terminal"),
    }),
});
async function getAllFiles(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getAllFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}
async function readFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent;
}
// Tool to document the codebase
const documentCodebaseTool = tool(async () => {
    const allFiles = await getAllFiles('./');
    let allCode = '';
    for (const file of allFiles) {
        allCode += `\n\n--- ${file} ---\n\n`;
        const fileContent = await readFile(file);
        allCode += fileContent;
    }
    return await documentCodebase(allCode);
}, {
    name: "document_codebase",
    description: "Creates documentation for the codebase.",
});
// Define the tools
const tools = [installNodePackages, documentCodebaseTool];
// Define the model
const model = new ChatAnthropic({
    model: "claude-3-7-sonnet-latest",
});
// Create the agent
const agent = createReactAgent({
    llm: model,
    tools: tools,
});
// Invoke the agent with the user prompt
(async () => {
    try {
        const result = await agent.invoke({
            messages: [
                {
                    role: "user", content: "please fetch all node packages and document this codebase.",
                },
            ],
        });
        console.log("Agent Response:", result);
        if (result.action.tool_name === "Final Answer") {
            console.log("Final Answer:", result.action.tool_input);
        }
        else if (result.action.tool_name === "document_codebase") {
            const docResult = await documentCodebaseTool.invoke({});
            console.log("document_codebase Result:", docResult);
        }
        else {
            const installResult = await installNodePackages.invoke({ command: "npm install" });
            console.log("install_node_packages Result:", installResult);
        }
    }
    catch (error) {
        console.error("Agent Invocation Error:", error);
    }
})();
//# sourceMappingURL=langgraph-react-agent.js.map
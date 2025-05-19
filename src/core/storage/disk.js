import * as path from "path";
import fs from "fs/promises";
import { fileExistsAtPath } from "../../utils/fs";
export const GlobalFileNames = {
    apiConversationHistory: "api_conversation_history.json",
    uiMessages: "ui_messages.json",
    openRouterModels: "openrouter_models.json",
    mcpSettings: "Klaus_mcp_settings.json",
    KlausRules: ".Klausrules",
};
export async function ensureTaskDirectoryExists(context, taskId) {
    const globalStoragePath = context.globalStorageUri.fsPath;
    const taskDir = path.join(globalStoragePath, "tasks", taskId);
    await fs.mkdir(taskDir, { recursive: true });
    return taskDir;
}
export async function getSavedApiConversationHistory(context, taskId) {
    const filePath = path.join(await ensureTaskDirectoryExists(context, taskId), GlobalFileNames.apiConversationHistory);
    const fileExists = await fileExistsAtPath(filePath);
    if (fileExists) {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    }
    return [];
}
export async function saveApiConversationHistory(context, taskId, apiConversationHistory) {
    try {
        const filePath = path.join(await ensureTaskDirectoryExists(context, taskId), GlobalFileNames.apiConversationHistory);
        await fs.writeFile(filePath, JSON.stringify(apiConversationHistory));
    }
    catch (error) {
        // in the off chance this fails, we don't want to stop the task
        console.error("Failed to save API conversation history:", error);
    }
}
export async function getSavedKlausMessages(context, taskId) {
    const filePath = path.join(await ensureTaskDirectoryExists(context, taskId), GlobalFileNames.uiMessages);
    if (await fileExistsAtPath(filePath)) {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    }
    else {
        // check old location
        const oldPath = path.join(await ensureTaskDirectoryExists(context, taskId), "claude_messages.json");
        if (await fileExistsAtPath(oldPath)) {
            const data = JSON.parse(await fs.readFile(oldPath, "utf8"));
            await fs.unlink(oldPath); // remove old file
            return data;
        }
    }
    return [];
}
export async function saveKlausMessages(context, taskId, uiMessages) {
    try {
        const taskDir = await ensureTaskDirectoryExists(context, taskId);
        const filePath = path.join(taskDir, GlobalFileNames.uiMessages);
        await fs.writeFile(filePath, JSON.stringify(uiMessages));
    }
    catch (error) {
        console.error("Failed to save ui messages:", error);
    }
}
//# sourceMappingURL=disk.js.map
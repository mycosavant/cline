import * as path from "path";
import * as fs from "fs/promises";
import { fileExistsAtPath } from "../../utils/fs";
import { GlobalFileNames } from "../../shared/globalFileNames";
import { getTaskDirectoryPath } from "../../shared/storagePathManager";
export async function readApiMessages({ taskId, globalStoragePath, }) {
    const taskDir = await getTaskDirectoryPath(globalStoragePath, taskId);
    const filePath = path.join(taskDir, GlobalFileNames.apiConversationHistory);
    if (await fileExistsAtPath(filePath)) {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
    }
    else {
        const oldPath = path.join(taskDir, "claude_messages.json");
        if (await fileExistsAtPath(oldPath)) {
            const data = JSON.parse(await fs.readFile(oldPath, "utf8"));
            await fs.unlink(oldPath);
            return data;
        }
    }
    return [];
}
export async function saveApiMessages({ messages, taskId, globalStoragePath, }) {
    const taskDir = await getTaskDirectoryPath(globalStoragePath, taskId);
    const filePath = path.join(taskDir, GlobalFileNames.apiConversationHistory);
    await fs.writeFile(filePath, JSON.stringify(messages));
}
//# sourceMappingURL=apiMessages.js.map
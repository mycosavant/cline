import { EventEmitter } from "events";
import * as vscode from "vscode";
import fs from "fs/promises";
import * as path from "path";
import { getWorkspacePath } from "../utils/path";
import { openClineInNewTab } from "../activate/registerCommands";
import { RooCodeEventName, isSecretStateKey, } from "../schemas";
import { IpcOrigin, IpcMessageType, TaskCommandName } from "../schemas";
import { IpcServer } from "./ipc";
import { outputChannelLog } from "./log";
export class API extends EventEmitter {
    outputChannel;
    sidebarProvider;
    context;
    ipc;
    taskMap = new Map();
    log;
    logfile;
    constructor(outputChannel, provider, socketPath, enableLogging = false) {
        super();
        this.outputChannel = outputChannel;
        this.sidebarProvider = provider;
        this.context = provider.context;
        if (enableLogging) {
            this.log = (...args) => {
                outputChannelLog(this.outputChannel, ...args);
                console.log(args);
            };
            this.logfile = path.join(getWorkspacePath(), "roo-code-messages.log");
        }
        else {
            this.log = () => { };
        }
        this.registerListeners(this.sidebarProvider);
        if (socketPath) {
            const ipc = (this.ipc = new IpcServer(socketPath, this.log));
            ipc.listen();
            this.log(`[API] ipc server started: socketPath=${socketPath}, pid=${process.pid}, ppid=${process.ppid}`);
            ipc.on(IpcMessageType.TaskCommand, async (_clientId, { commandName, data }) => {
                switch (commandName) {
                    case TaskCommandName.StartNewTask:
                        this.log(`[API] StartNewTask -> ${data.text}, ${JSON.stringify(data.configuration)}`);
                        await this.startNewTask(data);
                        break;
                    case TaskCommandName.CancelTask:
                        this.log(`[API] CancelTask -> ${data}`);
                        await this.cancelTask(data);
                        break;
                    case TaskCommandName.CloseTask:
                        this.log(`[API] CloseTask -> ${data}`);
                        await vscode.commands.executeCommand("workbench.action.files.saveFiles");
                        await vscode.commands.executeCommand("workbench.action.closeWindow");
                        break;
                }
            });
        }
    }
    emit(eventName, ...args) {
        const data = { eventName: eventName, payload: args };
        this.ipc?.broadcast({ type: IpcMessageType.TaskEvent, origin: IpcOrigin.Server, data });
        return super.emit(eventName, ...args);
    }
    async startNewTask({ configuration, text, images, newTab, }) {
        let provider;
        if (newTab) {
            await vscode.commands.executeCommand("workbench.action.files.revert");
            await vscode.commands.executeCommand("workbench.action.closeAllEditors");
            provider = await openClineInNewTab({ context: this.context, outputChannel: this.outputChannel });
            this.registerListeners(provider);
        }
        else {
            await vscode.commands.executeCommand("roo-cline.SidebarProvider.focus");
            provider = this.sidebarProvider;
        }
        if (configuration) {
            await provider.setValues(configuration);
            if (configuration.allowedCommands) {
                await vscode.workspace
                    .getConfiguration("roo-cline")
                    .update("allowedCommands", configuration.allowedCommands, vscode.ConfigurationTarget.Global);
            }
        }
        await provider.removeClineFromStack();
        await provider.postStateToWebview();
        await provider.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
        await provider.postMessageToWebview({ type: "invoke", invoke: "newChat", text, images });
        const { taskId } = await provider.initClineWithTask(text, images, undefined, {
            consecutiveMistakeLimit: Number.MAX_SAFE_INTEGER,
        });
        return taskId;
    }
    async resumeTask(taskId) {
        const { historyItem } = await this.sidebarProvider.getTaskWithId(taskId);
        await this.sidebarProvider.initClineWithHistoryItem(historyItem);
        await this.sidebarProvider.postMessageToWebview({ type: "action", action: "chatButtonClicked" });
    }
    async isTaskInHistory(taskId) {
        try {
            await this.sidebarProvider.getTaskWithId(taskId);
            return true;
        }
        catch {
            return false;
        }
    }
    getCurrentTaskStack() {
        return this.sidebarProvider.getCurrentTaskStack();
    }
    async clearCurrentTask(lastMessage) {
        await this.sidebarProvider.finishSubTask(lastMessage ?? "");
        await this.sidebarProvider.postStateToWebview();
    }
    async cancelCurrentTask() {
        await this.sidebarProvider.cancelTask();
    }
    async cancelTask(taskId) {
        const provider = this.taskMap.get(taskId);
        if (provider) {
            await provider.cancelTask();
            this.taskMap.delete(taskId);
        }
    }
    async sendMessage(text, images) {
        await this.sidebarProvider.postMessageToWebview({ type: "invoke", invoke: "sendMessage", text, images });
    }
    async pressPrimaryButton() {
        await this.sidebarProvider.postMessageToWebview({ type: "invoke", invoke: "primaryButtonClick" });
    }
    async pressSecondaryButton() {
        await this.sidebarProvider.postMessageToWebview({ type: "invoke", invoke: "secondaryButtonClick" });
    }
    isReady() {
        return this.sidebarProvider.viewLaunched;
    }
    registerListeners(provider) {
        provider.on("clineCreated", (cline) => {
            cline.on("taskStarted", async () => {
                this.emit(RooCodeEventName.TaskStarted, cline.taskId);
                this.taskMap.set(cline.taskId, provider);
                await this.fileLog(`[${new Date().toISOString()}] taskStarted -> ${cline.taskId}\n`);
            });
            cline.on("message", async (message) => {
                this.emit(RooCodeEventName.Message, { taskId: cline.taskId, ...message });
                if (message.message.partial !== true) {
                    await this.fileLog(`[${new Date().toISOString()}] ${JSON.stringify(message.message, null, 2)}\n`);
                }
            });
            cline.on("taskModeSwitched", (taskId, mode) => this.emit(RooCodeEventName.TaskModeSwitched, taskId, mode));
            cline.on("taskAskResponded", () => this.emit(RooCodeEventName.TaskAskResponded, cline.taskId));
            cline.on("taskAborted", () => {
                this.emit(RooCodeEventName.TaskAborted, cline.taskId);
                this.taskMap.delete(cline.taskId);
            });
            cline.on("taskCompleted", async (_, tokenUsage, toolUsage) => {
                this.emit(RooCodeEventName.TaskCompleted, cline.taskId, tokenUsage, toolUsage);
                this.taskMap.delete(cline.taskId);
                await this.fileLog(`[${new Date().toISOString()}] taskCompleted -> ${cline.taskId} | ${JSON.stringify(tokenUsage, null, 2)} | ${JSON.stringify(toolUsage, null, 2)}\n`);
            });
            cline.on("taskSpawned", (childTaskId) => this.emit(RooCodeEventName.TaskSpawned, cline.taskId, childTaskId));
            cline.on("taskPaused", () => this.emit(RooCodeEventName.TaskPaused, cline.taskId));
            cline.on("taskUnpaused", () => this.emit(RooCodeEventName.TaskUnpaused, cline.taskId));
            cline.on("taskTokenUsageUpdated", (_, usage) => this.emit(RooCodeEventName.TaskTokenUsageUpdated, cline.taskId, usage));
            cline.on("taskToolFailed", (taskId, tool, error) => this.emit(RooCodeEventName.TaskToolFailed, taskId, tool, error));
            this.emit(RooCodeEventName.TaskCreated, cline.taskId);
        });
    }
    async fileLog(message) {
        if (!this.logfile) {
            return;
        }
        try {
            await fs.appendFile(this.logfile, message, "utf8");
        }
        catch (_) {
            this.logfile = undefined;
        }
    }
    // Global Settings Management
    getConfiguration() {
        return Object.fromEntries(Object.entries(this.sidebarProvider.getValues()).filter(([key]) => !isSecretStateKey(key)));
    }
    async setConfiguration(values) {
        await this.sidebarProvider.contextProxy.setValues(values);
        await this.sidebarProvider.providerSettingsManager.saveConfig(values.currentApiConfigName || "default", values);
        await this.sidebarProvider.postStateToWebview();
    }
    // Provider Profile Management
    getProfiles() {
        return this.sidebarProvider.getProviderProfileEntries().map(({ name }) => name);
    }
    getProfileEntry(name) {
        return this.sidebarProvider.getProviderProfileEntry(name);
    }
    async createProfile(name, profile, activate = true) {
        const entry = this.getProfileEntry(name);
        if (entry) {
            throw new Error(`Profile with name "${name}" already exists`);
        }
        const id = await this.sidebarProvider.upsertProviderProfile(name, profile ?? {}, activate);
        if (!id) {
            throw new Error(`Failed to create profile with name "${name}"`);
        }
        return id;
    }
    async updateProfile(name, profile, activate = true) {
        const entry = this.getProfileEntry(name);
        if (!entry) {
            throw new Error(`Profile with name "${name}" does not exist`);
        }
        const id = await this.sidebarProvider.upsertProviderProfile(name, profile, activate);
        if (!id) {
            throw new Error(`Failed to update profile with name "${name}"`);
        }
        return id;
    }
    async upsertProfile(name, profile, activate = true) {
        const id = await this.sidebarProvider.upsertProviderProfile(name, profile, activate);
        if (!id) {
            throw new Error(`Failed to upsert profile with name "${name}"`);
        }
        return id;
    }
    async deleteProfile(name) {
        const entry = this.getProfileEntry(name);
        if (!entry) {
            throw new Error(`Profile with name "${name}" does not exist`);
        }
        await this.sidebarProvider.deleteProviderProfile(entry);
    }
    getActiveProfile() {
        return this.getConfiguration().currentApiConfigName;
    }
    async setActiveProfile(name) {
        const entry = this.getProfileEntry(name);
        if (!entry) {
            throw new Error(`Profile with name "${name}" does not exist`);
        }
        await this.sidebarProvider.activateProviderProfile({ name });
        return this.getActiveProfile();
    }
}
//# sourceMappingURL=api.js.map
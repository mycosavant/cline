import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { customModesSettingsSchema } from "../../schemas";
import { fileExistsAtPath } from "../../utils/fs";
import { arePathsEqual, getWorkspacePath } from "../../utils/path";
import { logger } from "../../utils/logging";
import { GlobalFileNames } from "../../shared/globalFileNames";
const ROOMODES_FILENAME = ".roomodes";
export class CustomModesManager {
    context;
    onUpdate;
    static cacheTTL = 10_000;
    disposables = [];
    isWriting = false;
    writeQueue = [];
    cachedModes = null;
    cachedAt = 0;
    constructor(context, onUpdate) {
        this.context = context;
        this.onUpdate = onUpdate;
        // TODO: We really shouldn't have async methods in the constructor.
        this.watchCustomModesFiles();
    }
    async queueWrite(operation) {
        this.writeQueue.push(operation);
        if (!this.isWriting) {
            await this.processWriteQueue();
        }
    }
    async processWriteQueue() {
        if (this.isWriting || this.writeQueue.length === 0) {
            return;
        }
        this.isWriting = true;
        try {
            while (this.writeQueue.length > 0) {
                const operation = this.writeQueue.shift();
                if (operation) {
                    await operation();
                }
            }
        }
        finally {
            this.isWriting = false;
        }
    }
    async getWorkspaceRoomodes() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        const workspaceRoot = getWorkspacePath();
        const roomodesPath = path.join(workspaceRoot, ROOMODES_FILENAME);
        const exists = await fileExistsAtPath(roomodesPath);
        return exists ? roomodesPath : undefined;
    }
    async loadModesFromFile(filePath) {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            const settings = JSON.parse(content);
            const result = customModesSettingsSchema.safeParse(settings);
            if (!result.success) {
                return [];
            }
            // Determine source based on file path
            const isRoomodes = filePath.endsWith(ROOMODES_FILENAME);
            const source = isRoomodes ? "project" : "global";
            // Add source to each mode
            return result.data.customModes.map((mode) => ({ ...mode, source }));
        }
        catch (error) {
            const errorMsg = `Failed to load modes from ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[CustomModesManager] ${errorMsg}`);
            return [];
        }
    }
    async mergeCustomModes(projectModes, globalModes) {
        const slugs = new Set();
        const merged = [];
        // Add project mode (takes precedence)
        for (const mode of projectModes) {
            if (!slugs.has(mode.slug)) {
                slugs.add(mode.slug);
                merged.push({ ...mode, source: "project" });
            }
        }
        // Add non-duplicate global modes
        for (const mode of globalModes) {
            if (!slugs.has(mode.slug)) {
                slugs.add(mode.slug);
                merged.push({ ...mode, source: "global" });
            }
        }
        return merged;
    }
    async getCustomModesFilePath() {
        const settingsDir = await this.ensureSettingsDirectoryExists();
        const filePath = path.join(settingsDir, GlobalFileNames.customModes);
        const fileExists = await fileExistsAtPath(filePath);
        if (!fileExists) {
            await this.queueWrite(() => fs.writeFile(filePath, JSON.stringify({ customModes: [] }, null, 2)));
        }
        return filePath;
    }
    async watchCustomModesFiles() {
        const settingsPath = await this.getCustomModesFilePath();
        // Watch settings file
        this.disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (arePathsEqual(document.uri.fsPath, settingsPath)) {
                const content = await fs.readFile(settingsPath, "utf-8");
                const errorMessage = "Invalid custom modes format. Please ensure your settings follow the correct JSON format.";
                let config;
                try {
                    config = JSON.parse(content);
                }
                catch (error) {
                    console.error(error);
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                const result = customModesSettingsSchema.safeParse(config);
                if (!result.success) {
                    vscode.window.showErrorMessage(errorMessage);
                    return;
                }
                // Get modes from .roomodes if it exists (takes precedence)
                const roomodesPath = await this.getWorkspaceRoomodes();
                const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
                // Merge modes from both sources (.roomodes takes precedence)
                const mergedModes = await this.mergeCustomModes(roomodesModes, result.data.customModes);
                await this.context.globalState.update("customModes", mergedModes);
                this.clearCache();
                await this.onUpdate();
            }
        }));
        // Watch .roomodes file if it exists
        const roomodesPath = await this.getWorkspaceRoomodes();
        if (roomodesPath) {
            this.disposables.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
                if (arePathsEqual(document.uri.fsPath, roomodesPath)) {
                    const settingsModes = await this.loadModesFromFile(settingsPath);
                    const roomodesModes = await this.loadModesFromFile(roomodesPath);
                    // .roomodes takes precedence
                    const mergedModes = await this.mergeCustomModes(roomodesModes, settingsModes);
                    await this.context.globalState.update("customModes", mergedModes);
                    this.clearCache();
                    await this.onUpdate();
                }
            }));
        }
    }
    async getCustomModes() {
        // Check if we have a valid cached result.
        const now = Date.now();
        if (this.cachedModes && now - this.cachedAt < CustomModesManager.cacheTTL) {
            return this.cachedModes;
        }
        // Get modes from settings file.
        const settingsPath = await this.getCustomModesFilePath();
        const settingsModes = await this.loadModesFromFile(settingsPath);
        // Get modes from .roomodes if it exists.
        const roomodesPath = await this.getWorkspaceRoomodes();
        const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
        // Create maps to store modes by source.
        const projectModes = new Map();
        const globalModes = new Map();
        // Add project modes (they take precedence).
        for (const mode of roomodesModes) {
            projectModes.set(mode.slug, { ...mode, source: "project" });
        }
        // Add global modes.
        for (const mode of settingsModes) {
            if (!projectModes.has(mode.slug)) {
                globalModes.set(mode.slug, { ...mode, source: "global" });
            }
        }
        // Combine modes in the correct order: project modes first, then global modes.
        const mergedModes = [
            ...roomodesModes.map((mode) => ({ ...mode, source: "project" })),
            ...settingsModes
                .filter((mode) => !projectModes.has(mode.slug))
                .map((mode) => ({ ...mode, source: "global" })),
        ];
        await this.context.globalState.update("customModes", mergedModes);
        this.cachedModes = mergedModes;
        this.cachedAt = now;
        return mergedModes;
    }
    async updateCustomMode(slug, config) {
        try {
            const isProjectMode = config.source === "project";
            let targetPath;
            if (isProjectMode) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    logger.error("Failed to update project mode: No workspace folder found", { slug });
                    throw new Error("No workspace folder found for project-specific mode");
                }
                const workspaceRoot = getWorkspacePath();
                targetPath = path.join(workspaceRoot, ROOMODES_FILENAME);
                const exists = await fileExistsAtPath(targetPath);
                logger.info(`${exists ? "Updating" : "Creating"} project mode in ${ROOMODES_FILENAME}`, {
                    slug,
                    workspace: workspaceRoot,
                });
            }
            else {
                targetPath = await this.getCustomModesFilePath();
            }
            await this.queueWrite(async () => {
                // Ensure source is set correctly based on target file.
                const modeWithSource = {
                    ...config,
                    source: isProjectMode ? "project" : "global",
                };
                await this.updateModesInFile(targetPath, (modes) => {
                    const updatedModes = modes.filter((m) => m.slug !== slug);
                    updatedModes.push(modeWithSource);
                    return updatedModes;
                });
                this.clearCache();
                await this.refreshMergedState();
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("Failed to update custom mode", { slug, error: errorMessage });
            vscode.window.showErrorMessage(`Failed to update custom mode: ${errorMessage}`);
        }
    }
    async updateModesInFile(filePath, operation) {
        let content = "{}";
        try {
            content = await fs.readFile(filePath, "utf-8");
        }
        catch (error) {
            // File might not exist yet.
            content = JSON.stringify({ customModes: [] });
        }
        let settings;
        try {
            settings = JSON.parse(content);
        }
        catch (error) {
            console.error(`[CustomModesManager] Failed to parse JSON from ${filePath}:`, error);
            settings = { customModes: [] };
        }
        settings.customModes = operation(settings.customModes || []);
        await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf-8");
    }
    async refreshMergedState() {
        const settingsPath = await this.getCustomModesFilePath();
        const roomodesPath = await this.getWorkspaceRoomodes();
        const settingsModes = await this.loadModesFromFile(settingsPath);
        const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
        const mergedModes = await this.mergeCustomModes(roomodesModes, settingsModes);
        await this.context.globalState.update("customModes", mergedModes);
        this.clearCache();
        await this.onUpdate();
    }
    async deleteCustomMode(slug) {
        try {
            const settingsPath = await this.getCustomModesFilePath();
            const roomodesPath = await this.getWorkspaceRoomodes();
            const settingsModes = await this.loadModesFromFile(settingsPath);
            const roomodesModes = roomodesPath ? await this.loadModesFromFile(roomodesPath) : [];
            // Find the mode in either file
            const projectMode = roomodesModes.find((m) => m.slug === slug);
            const globalMode = settingsModes.find((m) => m.slug === slug);
            if (!projectMode && !globalMode) {
                throw new Error("Write error: Mode not found");
            }
            await this.queueWrite(async () => {
                // Delete from project first if it exists there
                if (projectMode && roomodesPath) {
                    await this.updateModesInFile(roomodesPath, (modes) => modes.filter((m) => m.slug !== slug));
                }
                // Delete from global settings if it exists there
                if (globalMode) {
                    await this.updateModesInFile(settingsPath, (modes) => modes.filter((m) => m.slug !== slug));
                }
                // Clear cache when modes are deleted
                this.clearCache();
                await this.refreshMergedState();
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete custom mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async ensureSettingsDirectoryExists() {
        const settingsDir = path.join(this.context.globalStorageUri.fsPath, "settings");
        await fs.mkdir(settingsDir, { recursive: true });
        return settingsDir;
    }
    async resetCustomModes() {
        try {
            const filePath = await this.getCustomModesFilePath();
            await fs.writeFile(filePath, JSON.stringify({ customModes: [] }, null, 2));
            await this.context.globalState.update("customModes", []);
            this.clearCache();
            await this.onUpdate();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to reset custom modes: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    clearCache() {
        this.cachedModes = null;
        this.cachedAt = 0;
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
//# sourceMappingURL=CustomModesManager.js.map
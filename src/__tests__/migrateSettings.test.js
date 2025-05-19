import * as path from "path";
import * as fs from "fs/promises";
import { fileExistsAtPath } from "../utils/fs";
import { GlobalFileNames } from "../shared/globalFileNames";
import { migrateSettings } from "../utils/migrateSettings";
// Mock dependencies
jest.mock("vscode");
jest.mock("fs/promises");
jest.mock("fs");
jest.mock("../utils/fs");
describe("Settings Migration", () => {
    let mockContext;
    let mockOutputChannel;
    const mockStoragePath = "/mock/storage";
    const mockSettingsDir = path.join(mockStoragePath, "settings");
    // Legacy file names
    const legacyCustomModesPath = path.join(mockSettingsDir, "cline_custom_modes.json");
    const legacyMcpSettingsPath = path.join(mockSettingsDir, "cline_mcp_settings.json");
    // New file names
    const newCustomModesPath = path.join(mockSettingsDir, GlobalFileNames.customModes);
    const newMcpSettingsPath = path.join(mockSettingsDir, GlobalFileNames.mcpSettings);
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        };
        // Mock extension context
        mockContext = {
            globalStorageUri: { fsPath: mockStoragePath },
        };
        global.outputChannel = mockOutputChannel;
    });
    it("should migrate custom modes file if old file exists and new file doesn't", async () => {
        // Mock file existence checks
        ;
        fileExistsAtPath.mockImplementation(async (path) => {
            if (path === mockSettingsDir)
                return true;
            if (path === legacyCustomModesPath)
                return true;
            if (path === newCustomModesPath)
                return false;
            return false;
        });
        await migrateSettings(mockContext, mockOutputChannel);
        // Verify file was renamed
        expect(fs.rename).toHaveBeenCalledWith(legacyCustomModesPath, newCustomModesPath);
    });
    it("should migrate MCP settings file if old file exists and new file doesn't", async () => {
        // Mock file existence checks
        ;
        fileExistsAtPath.mockImplementation(async (path) => {
            if (path === mockSettingsDir)
                return true;
            if (path === legacyMcpSettingsPath)
                return true;
            if (path === newMcpSettingsPath)
                return false;
            return false;
        });
        await migrateSettings(mockContext, mockOutputChannel);
        // Verify file was renamed
        expect(fs.rename).toHaveBeenCalledWith(legacyMcpSettingsPath, newMcpSettingsPath);
    });
    it("should not migrate if new file already exists", async () => {
        // Mock file existence checks
        ;
        fileExistsAtPath.mockImplementation(async (path) => {
            if (path === mockSettingsDir)
                return true;
            if (path === legacyCustomModesPath)
                return true;
            if (path === newCustomModesPath)
                return true;
            if (path === legacyMcpSettingsPath)
                return true;
            if (path === newMcpSettingsPath)
                return true;
            return false;
        });
        await migrateSettings(mockContext, mockOutputChannel);
        // Verify no files were renamed
        expect(fs.rename).not.toHaveBeenCalled();
    });
    it("should handle errors gracefully", async () => {
        // Mock file existence checks to throw an error
        ;
        fileExistsAtPath.mockRejectedValue(new Error("Test error"));
        global.outputChannel = mockOutputChannel;
        await migrateSettings(mockContext, mockOutputChannel);
        // Verify error was logged
        expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining("Error migrating settings files"));
    });
});
//# sourceMappingURL=migrateSettings.test.js.map
// npx jest src/core/environment/__tests__/getEnvironmentDetails.test.ts
import pWaitFor from "p-wait-for";
import delay from "delay";
import { getEnvironmentDetails } from "../getEnvironmentDetails";
import { EXPERIMENT_IDS, experiments } from "../../../shared/experiments";
import { defaultModeSlug, getFullModeDetails, getModeBySlug, isToolAllowedForMode } from "../../../shared/modes";
import { getApiMetrics } from "../../../shared/getApiMetrics";
import { listFiles } from "../../../services/glob/list-files";
import { TerminalRegistry } from "../../../integrations/terminal/TerminalRegistry";
import { Terminal } from "../../../integrations/terminal/Terminal";
import { arePathsEqual } from "../../../utils/path";
import { formatResponse } from "../../prompts/responses";
jest.mock("vscode", () => ({
    window: {
        tabGroups: { all: [], onDidChangeTabs: jest.fn() },
        visibleTextEditors: [],
    },
    env: {
        language: "en-US",
    },
}));
jest.mock("p-wait-for");
jest.mock("delay");
jest.mock("execa", () => ({
    execa: jest.fn(),
}));
jest.mock("../../../shared/experiments");
jest.mock("../../../shared/modes");
jest.mock("../../../shared/getApiMetrics");
jest.mock("../../../services/glob/list-files");
jest.mock("../../../integrations/terminal/TerminalRegistry");
jest.mock("../../../integrations/terminal/Terminal");
jest.mock("../../../utils/path");
jest.mock("../../prompts/responses");
describe("getEnvironmentDetails", () => {
    const mockCwd = "/test/path";
    const mockTaskId = "test-task-id";
    let mockCline;
    let mockProvider;
    let mockState;
    beforeEach(() => {
        jest.clearAllMocks();
        mockState = {
            terminalOutputLineLimit: 100,
            maxWorkspaceFiles: 50,
            maxOpenTabsContext: 10,
            mode: "code",
            customModes: [],
            experiments: {},
            customInstructions: "test instructions",
            language: "en",
            showRooIgnoredFiles: true,
        };
        mockProvider = {
            getState: jest.fn().mockResolvedValue(mockState),
        };
        mockCline = {
            cwd: mockCwd,
            taskId: mockTaskId,
            didEditFile: false,
            fileContextTracker: {
                getAndClearRecentlyModifiedFiles: jest.fn().mockReturnValue([]),
            },
            rooIgnoreController: {
                filterPaths: jest.fn((paths) => paths.join("\n")),
                cwd: mockCwd,
                ignoreInstance: {},
                disposables: [],
                rooIgnoreContent: "",
                isPathIgnored: jest.fn(),
                getIgnoreContent: jest.fn(),
                updateIgnoreContent: jest.fn(),
                addToIgnore: jest.fn(),
                removeFromIgnore: jest.fn(),
                dispose: jest.fn(),
            },
            clineMessages: [],
            api: {
                getModel: jest.fn().mockReturnValue({ id: "test-model", info: { contextWindow: 100000 } }),
                createMessage: jest.fn(),
                countTokens: jest.fn(),
            },
            diffEnabled: true,
            providerRef: {
                deref: jest.fn().mockReturnValue(mockProvider),
                [Symbol.toStringTag]: "WeakRef",
            },
        };
        getApiMetrics.mockReturnValue({ contextTokens: 50000, totalCost: 0.25 });
        getFullModeDetails.mockResolvedValue({
            name: "💻 Code",
            roleDefinition: "You are a code assistant",
            customInstructions: "Custom instructions",
        });
        isToolAllowedForMode.mockReturnValue(true);
        listFiles.mockResolvedValue([["file1.ts", "file2.ts"], false]);
        formatResponse.formatFilesList.mockReturnValue("file1.ts\nfile2.ts");
        arePathsEqual.mockReturnValue(false);
        Terminal.compressTerminalOutput.mockImplementation((output) => output);
        TerminalRegistry.getTerminals.mockReturnValue([]);
        TerminalRegistry.getBackgroundTerminals.mockReturnValue([]);
        TerminalRegistry.isProcessHot.mockReturnValue(false);
        TerminalRegistry.getUnretrievedOutput.mockReturnValue("");
        pWaitFor.mockResolvedValue(undefined);
        delay.mockResolvedValue(undefined);
    });
    it("should return basic environment details", async () => {
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("<environment_details>");
        expect(result).toContain("</environment_details>");
        expect(result).toContain("# VSCode Visible Files");
        expect(result).toContain("# VSCode Open Tabs");
        expect(result).toContain("# Current Time");
        expect(result).toContain("# Current Context Size (Tokens)");
        expect(result).toContain("# Current Cost");
        expect(result).toContain("# Current Mode");
        expect(result).toContain("<model>test-model</model>");
        expect(mockProvider.getState).toHaveBeenCalled();
        expect(getFullModeDetails).toHaveBeenCalledWith("code", [], undefined, {
            cwd: mockCwd,
            globalCustomInstructions: "test instructions",
            language: "en",
        });
        expect(getApiMetrics).toHaveBeenCalledWith(mockCline.clineMessages);
    });
    it("should include file details when includeFileDetails is true", async () => {
        const result = await getEnvironmentDetails(mockCline, true);
        expect(result).toContain("# Current Workspace Directory");
        expect(result).toContain("Files");
        expect(listFiles).toHaveBeenCalledWith(mockCwd, true, 50);
        expect(formatResponse.formatFilesList).toHaveBeenCalledWith(mockCwd, ["file1.ts", "file2.ts"], false, mockCline.rooIgnoreController, true);
    });
    it("should not include file details when includeFileDetails is false", async () => {
        await getEnvironmentDetails(mockCline, false);
        expect(listFiles).not.toHaveBeenCalled();
        expect(formatResponse.formatFilesList).not.toHaveBeenCalled();
    });
    it("should handle desktop directory specially", async () => {
        ;
        arePathsEqual.mockReturnValue(true);
        const result = await getEnvironmentDetails(mockCline, true);
        expect(result).toContain("Desktop files not shown automatically");
        expect(listFiles).not.toHaveBeenCalled();
    });
    it("should include recently modified files if any", async () => {
        ;
        mockCline.fileContextTracker.getAndClearRecentlyModifiedFiles.mockReturnValue([
            "modified1.ts",
            "modified2.ts",
        ]);
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("# Recently Modified Files");
        expect(result).toContain("modified1.ts");
        expect(result).toContain("modified2.ts");
    });
    it("should include active terminal information", async () => {
        const mockActiveTerminal = {
            id: "terminal-1",
            getLastCommand: jest.fn().mockReturnValue("npm test"),
            getProcessesWithOutput: jest.fn().mockReturnValue([]),
        };
        TerminalRegistry.getTerminals.mockReturnValue([mockActiveTerminal]);
        TerminalRegistry.getUnretrievedOutput.mockReturnValue("Test output");
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("# Actively Running Terminals");
        expect(result).toContain("Original command: `npm test`");
        expect(result).toContain("Test output");
        mockCline.didEditFile = true;
        await getEnvironmentDetails(mockCline);
        expect(delay).toHaveBeenCalledWith(300);
        expect(pWaitFor).toHaveBeenCalled();
    });
    it("should include inactive terminals with output", async () => {
        const mockProcess = {
            command: "npm build",
            getUnretrievedOutput: jest.fn().mockReturnValue("Build output"),
        };
        const mockInactiveTerminal = {
            id: "terminal-2",
            getProcessesWithOutput: jest.fn().mockReturnValue([mockProcess]),
            cleanCompletedProcessQueue: jest.fn(),
        };
        TerminalRegistry.getTerminals.mockImplementation((active) => active ? [] : [mockInactiveTerminal]);
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("# Inactive Terminals with Completed Process Output");
        expect(result).toContain("Terminal terminal-2");
        expect(result).toContain("Command: `npm build`");
        expect(result).toContain("Build output");
        expect(mockInactiveTerminal.cleanCompletedProcessQueue).toHaveBeenCalled();
    });
    it("should include warning when file writing is not allowed", async () => {
        ;
        isToolAllowedForMode.mockReturnValue(false);
        getModeBySlug.mockImplementation((slug) => {
            if (slug === "code") {
                return { name: "💻 Code" };
            }
            if (slug === defaultModeSlug) {
                return { name: "Default Mode" };
            }
            return null;
        });
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("NOTE: You are currently in '💻 Code' mode, which does not allow write operations");
    });
    it("should include experiment-specific details when Power Steering is enabled", async () => {
        mockState.experiments = { [EXPERIMENT_IDS.POWER_STEERING]: true };
        experiments.isEnabled.mockReturnValue(true);
        const result = await getEnvironmentDetails(mockCline);
        expect(result).toContain("<role>You are a code assistant</role>");
        expect(result).toContain("<custom_instructions>Custom instructions</custom_instructions>");
    });
    it("should handle missing provider or state", async () => {
        // Mock provider to return null.
        mockCline.providerRef.deref = jest.fn().mockReturnValue(null);
        const result = await getEnvironmentDetails(mockCline);
        // Verify the function still returns a result.
        expect(result).toContain("<environment_details>");
        expect(result).toContain("</environment_details>");
        // Mock provider to return null state.
        mockCline.providerRef.deref = jest.fn().mockReturnValue({
            getState: jest.fn().mockResolvedValue(null),
        });
        const result2 = await getEnvironmentDetails(mockCline);
        // Verify the function still returns a result.
        expect(result2).toContain("<environment_details>");
        expect(result2).toContain("</environment_details>");
    });
    it("should handle errors gracefully", async () => {
        ;
        pWaitFor.mockRejectedValue(new Error("Test error"));
        const mockErrorTerminal = {
            id: "terminal-1",
            getLastCommand: jest.fn().mockReturnValue("npm test"),
            getProcessesWithOutput: jest.fn().mockReturnValue([]),
        };
        TerminalRegistry.getTerminals.mockReturnValue([mockErrorTerminal]);
        TerminalRegistry.getBackgroundTerminals.mockReturnValue([]);
        mockCline.fileContextTracker.getAndClearRecentlyModifiedFiles.mockReturnValue([]);
        await expect(getEnvironmentDetails(mockCline)).resolves.not.toThrow();
    });
});
//# sourceMappingURL=getEnvironmentDetails.test.js.map
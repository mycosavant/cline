import * as vscode from "vscode";
import { EditorUtils } from "../integrations/editor/EditorUtils";
export const ACTION_TITLES = {
    EXPLAIN: "Explain with Roo Code",
    FIX: "Fix with Roo Code",
    IMPROVE: "Improve with Roo Code",
    ADD_TO_CONTEXT: "Add to Roo Code",
    NEW_TASK: "New Roo Code Task",
};
export const COMMAND_IDS = {
    EXPLAIN: "roo-cline.explainCode",
    FIX: "roo-cline.fixCode",
    IMPROVE: "roo-cline.improveCode",
    ADD_TO_CONTEXT: "roo-cline.addToContext",
    NEW_TASK: "roo-cline.newTask",
};
export class CodeActionProvider {
    static providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.RefactorRewrite,
    ];
    createAction(title, kind, command, args) {
        const action = new vscode.CodeAction(title, kind);
        action.command = { command, title, arguments: args };
        return action;
    }
    provideCodeActions(document, range, context) {
        try {
            const effectiveRange = EditorUtils.getEffectiveRange(document, range);
            if (!effectiveRange) {
                return [];
            }
            const filePath = EditorUtils.getFilePath(document);
            const actions = [];
            actions.push(this.createAction(ACTION_TITLES.ADD_TO_CONTEXT, vscode.CodeActionKind.QuickFix, COMMAND_IDS.ADD_TO_CONTEXT, [
                filePath,
                effectiveRange.text,
                effectiveRange.range.start.line + 1,
                effectiveRange.range.end.line + 1,
            ]));
            if (context.diagnostics.length > 0) {
                const relevantDiagnostics = context.diagnostics.filter((d) => EditorUtils.hasIntersectingRange(effectiveRange.range, d.range));
                if (relevantDiagnostics.length > 0) {
                    actions.push(this.createAction(ACTION_TITLES.FIX, vscode.CodeActionKind.QuickFix, COMMAND_IDS.FIX, [
                        filePath,
                        effectiveRange.text,
                        effectiveRange.range.start.line + 1,
                        effectiveRange.range.end.line + 1,
                        relevantDiagnostics.map(EditorUtils.createDiagnosticData),
                    ]));
                }
            }
            else {
                actions.push(this.createAction(ACTION_TITLES.EXPLAIN, vscode.CodeActionKind.QuickFix, COMMAND_IDS.EXPLAIN, [
                    filePath,
                    effectiveRange.text,
                    effectiveRange.range.start.line + 1,
                    effectiveRange.range.end.line + 1,
                ]));
                actions.push(this.createAction(ACTION_TITLES.IMPROVE, vscode.CodeActionKind.QuickFix, COMMAND_IDS.IMPROVE, [
                    filePath,
                    effectiveRange.text,
                    effectiveRange.range.start.line + 1,
                    effectiveRange.range.end.line + 1,
                ]));
            }
            return actions;
        }
        catch (error) {
            console.error("Error providing code actions:", error);
            return [];
        }
    }
}
//# sourceMappingURL=CodeActionProvider.js.map
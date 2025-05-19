declare module 'vscode' {
  export interface ExtensionContext {
    subscriptions: { dispose(): any }[];
    extensionUri: any;
  }

  export interface TextEditor {
    document: TextDocument;
    selection: Selection;
    viewColumn?: number;
  }

  export interface TextDocument {
    uri: Uri;
    getText(range?: Range): string;
    languageId: string;
    offsetAt(position: Position): number;
    lineAt(line: number): { text: string };
    lineCount: number;
  }

  export interface Uri {
    fsPath: string;
    path: string;
    query: string;
    scheme: string;
  }

  export interface Position {
    line: number;
    character: number;
  }

  export interface Selection {
    start: Position;
    end: Position;
  }

  export class Range {
    start: Position;
    end: Position;
    constructor(
      startLine: number,
      startCharacter: number,
      endLine: number,
      endCharacter: number
    );
  }

  export interface Diagnostic {
    message: string;
    range: Range;
    severity: number;
  }

  export interface CodeActionContext {
    diagnostics: Diagnostic[];
  }

  export class CodeAction {
    title: string;
    command?: {
      command: string;
      title: string;
      arguments?: any[];
    };
    constructor(title: string, kind: CodeActionKind);
  }

  export interface CodeActionProvider {
    provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext): CodeAction[];
  }

  export interface TextDocumentContentProvider {
    provideTextDocumentContent(uri: Uri): string;
  }

  export interface WebviewPanel {
    webview: {
      html: string;
    };
    iconPath: {
      light: Uri;
      dark: Uri;
    };
    dispose(): void;
    onDidDispose(callback: () => void, thisArg?: any, disposables?: { dispose(): any }[]): void;
  }

  export interface Disposable {
    dispose(): void;
  }

  export interface OutputChannel {
    appendLine(value: string): void;
    append(value: string): void;
    show(): void;
    dispose(): void;
  }

  export enum ViewColumn {
    One = 1,
    Two = 2,
    Three = 3,
  }

  export class CodeActionKind {
    static readonly QuickFix: CodeActionKind;
    static readonly RefactorRewrite: CodeActionKind;
  }

  export class RelativePattern {
    constructor(base: string, pattern: string);
  }

  export namespace window {
    export function createOutputChannel(name: string): OutputChannel;
    export function showErrorMessage(message: string): void;
    export const activeTextEditor: TextEditor | undefined;
    export const visibleTextEditors: TextEditor[];
    export function createWebviewPanel(
      viewType: string,
      title: string,
      column: ViewColumn,
      options: any
    ): WebviewPanel;
    export function registerWebviewViewProvider(
      viewId: string,
      provider: any,
      options?: any
    ): Disposable;
    export function registerUriHandler(handler: { handleUri(uri: Uri): void }): Disposable;
    export const activeTerminal: { name: string };
  }

  export namespace workspace {
    export function registerTextDocumentContentProvider(
      scheme: string,
      provider: TextDocumentContentProvider
    ): Disposable;
    export const workspaceFolders: { uri: Uri }[];
    export function createFileSystemWatcher(pattern: any): {
      onDidChange(callback: (uri: any) => void): void;
    };
  }

  export namespace commands {
    export function registerCommand(
      command: string,
      callback: (...args: any[]) => any
    ): Disposable;
    export function executeCommand(command: string, ...args: any[]): Promise<any>;
  }

  export namespace languages {
    export function registerCodeActionsProvider(
      selector: string | string[],
      provider: CodeActionProvider,
      metadata?: { providedCodeActionKinds: CodeActionKind[] }
    ): Disposable;
  }

  export namespace env {
    export const clipboard: {
      readText(): Promise<string>;
      writeText(text: string): Promise<void>;
    };
  }

  export namespace Uri {
    export function joinPath(base: Uri, ...pathSegments: string[]): Uri;
  }
}
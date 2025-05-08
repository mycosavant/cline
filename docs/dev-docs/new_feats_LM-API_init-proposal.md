# Designing and implementing all of those suggestions (deep VS Code integrations and 11 new tools) would be a substantial project.

Let's approach this iteratively. We can start by designing the core implementation strategy for a few key examples to establish the patterns. We'll focus on how Klaus, as a VS Code extension, would interact with the VS Code APIs and how the backend logic for the new tools might work.

Here are a few examples covering both VS Code integration and new tool implementation:

Goal: Allow users to right-click or use a lightbulb action on a function/class to have Klaus generate a docstring.

VS Code API: vscode.languages.registerCodeActionsProvider
Klaus Tool (Internal): generate_docstring (Path, Line) -> Text
Implementation Outline (Extension Side - src/extension.ts or similar):

import * as vscode from 'vscode';
import { klausController } from './core/controller/KlausController'; // Assuming a central controller

// 1. Register Code Action Provider
context.subscriptions.push(
  vscode.languages.registerCodeActionsProvider(
    // Define document selectors (e.g., ['typescript', 'python', 'javascript'])
    ['typescript', 'python', 'javascript'], 
    new KlausDocstringActionProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite],
    }
  )
);

// 2. Implement the Provider
class KlausDocstringActionProvider implements vscode.CodeActionProvider {
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {

    // Check if the cursor is on a function/class definition (basic check, needs refinement)
    // A more robust check might involve parsing with Tree-sitter
    const lineText = document.lineAt(range.start.line).text;
    const isFunctionOrClass = /^(async\s+)?function\s+|\bclass\s+|def\s+/.test(lineText.trim());

    if (!isFunctionOrClass || range.isEmpty) { // Only show if selection is empty (cursor on line)
      return undefined;
    }

    // Create the Code Action
    const action = new vscode.CodeAction(
      'Klaus: Generate Docstring',
      vscode.CodeActionKind.RefactorRewrite
    );

    // Set the command to execute when the action is selected
    action.command = {
      command: 'klaus.generateDocstringAction', // We'll register this command
      title: 'Generate Docstring',
      arguments: [document.uri, range.start.line], // Pass necessary context
    };

    return [action];
  }
}

// 3. Register the Command Handler
context.subscriptions.push(
  vscode.commands.registerCommand('klaus.generateDocstringAction', 
    async (docUri: vscode.Uri, line: number) => {
      const document = await vscode.workspace.openTextDocument(docUri);
      const relativePath = vscode.workspace.asRelativePath(docUri);

      // Show progress indication
      vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Klaus: Generating Docstring...",
          cancellable: true
      }, async (progress, token) => {
          try {
              // Call Klaus backend/controller to handle the generation
              // This might involve sending the file content + line number
              // and receiving the generated docstring and insertion point.
              const result = await klausController.generateDocstringInternal(relativePath, line, document.getText(), token); 
              
              if (result && result.docstring && result.insertLine !== undefined) {
                 // Apply the change to the editor
                 const edit = new vscode.WorkspaceEdit();
                 // Calculate correct indentation based on the function line
                 const functionLine = document.lineAt(line);
                 const indent = functionLine.text.match(/^\s*/)?.[0] ?? '';
                 const indentedDocstring = result.docstring.split('\\n').map(l => indent + l).join('\\n') + '\\n'; 

                 edit.insert(docUri, new vscode.Position(result.insertLine, 0), indentedDocstring);
                 await vscode.workspace.applyEdit(edit);
              } else {
                 vscode.window.showErrorMessage('Klaus failed to generate docstring.');
              }
          } catch (error: any) {
              vscode.window.showErrorMessage(`Klaus error: ${error.message}`);
              console.error(error);
          }
      });
    }
  )
);


Backend (generate_docstring Tool Logic):

Receive path, line, and potentially the full fileContent.
Parse Code: Use a parser (like Tree-sitter) to accurately identify the function/class signature (name, parameters, return type) at the specified line. Extract relevant context from the function body if needed.
Prepare LLM Prompt: Construct a prompt for the LLM, including the code signature, maybe surrounding code, and instructions to generate a docstring in the language's standard format (e.g., JSDoc, Python docstring, TSDoc).
Call LLM: Send the prompt to the configured LLM (potentially via vscode.lm if integrated, or Klaus's own backend).
Process Response: Parse the LLM response to extract the generated docstring text.
Determine Insertion Point: Based on the parsing in step 2, determine the correct line number to insert the docstring (usually the line right after the function/class signature).
Return Result: Send back the docstring text and insertLine number to the VS Code extension.
Goal: Automatically detect complex functions and display warnings in the "Problems" panel.
VS Code API: vscode.languages.createDiagnosticCollection, vscode.Diagnostic, vscode.DiagnosticSeverity
Klaus Tool (Internal): analyze_code_complexity (Path, function_name?) -> Complexity Metrics
Implementation Outline (Extension Side):

import * as vscode from 'vscode';
import { klausController } from './core/controller/KlausController'; // Assuming controller handles analysis

// 1. Create Diagnostic Collection
const complexityDiagnosticCollection = vscode.languages.createDiagnosticCollection('klausComplexity');
context.subscriptions.push(complexityDiagnosticCollection);

// 2. Trigger Analysis (e.g., on document save or change)
context.subscriptions.push(
  vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (/* document language is supported, e.g., typescript, python */) {
      updateComplexityDiagnostics(document);
    }
  })
);
// Optionally trigger on open or change (debounced)
context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
        // Add debouncing here if desired
        if (event.document.uri.scheme === 'file' && /* language supported */) {
            updateComplexityDiagnostics(event.document);
        }
    })
);


// 3. Function to Update Diagnostics
async function updateComplexityDiagnostics(document: vscode.TextDocument) {
  const relativePath = vscode.workspace.asRelativePath(document.uri);
  try {
    // Call Klaus backend/controller for complexity analysis
    // This might return an array of issues { functionName, complexityScore, startLine, endLine, message }
    const complexityIssues = await klausController.analyzeComplexityInternal(relativePath, document.getText()); 

    const diagnostics: vscode.Diagnostic[] = [];
    if (complexityIssues) {
      for (const issue of complexityIssues) {
         // Example threshold - make configurable
         const COMPLEXITY_THRESHOLD = 10; 
         if (issue.complexityScore > COMPLEXITY_THRESHOLD) {
            const range = new vscode.Range(issue.startLine, 0, issue.endLine, 0); // Adjust range as needed
            const message = `Klaus: High cyclomatic complexity (${issue.complexityScore}) in function '${issue.functionName}'. Consider refactoring.`;
            const diagnostic = new vscode.Diagnostic(
                range, 
                message, 
                vscode.DiagnosticSeverity.Warning // Or Information
            );
            diagnostic.code = 'klaus-complexity'; // For filtering/actions
            diagnostic.source = 'Klaus';
            // Optionally add related information or quick fixes via Code Actions later
            diagnostics.push(diagnostic);
         }
      }
    }
    
    // Update the collection for this document
    complexityDiagnosticCollection.set(document.uri, diagnostics);

  } catch (error) {
    console.error(`Klaus complexity analysis error for ${relativePath}:`, error);
    // Optionally clear diagnostics on error or show a notification
    // complexityDiagnosticCollection.delete(document.uri); 
  }
}


Backend (analyze_code_complexity Tool Logic):

Receive path and fileContent.
Parse Code: Use a robust parser (like Tree-sitter) to identify all functions/methods within the file.
Calculate Complexity: For each function, use a library (specific to the language, e.g., escomplex for JS, radon for Python) to calculate cyclomatic complexity (and potentially other metrics like cognitive complexity or Halstead).
Collect Results: Store the function name, complexity score, and line numbers for each function analyzed.
Return Results: Send back an array of complexity results { functionName, complexityScore, startLine, endLine } to the VS Code extension.
Goal: Execute a linter command and return the results.
Klaus Tool: run_linter (Path, Fix?) -> Linter Output Text or Structured Issues
Implementation Outline (Backend/Tool Runner):

// Assuming an environment where commands can be executed (like Klaus's backend)
import { runTerminalCommandInternal } from './terminalUtils'; // Helper for running commands

async function executeRunLinterTool(params: { path: string; fix?: boolean }): Promise<{ output: string, success: boolean }> {
  const { path, fix = false } = params;

  // 1. Detect Linter/Formatter (or use configuration)
  // This is complex - could check project files (package.json, pyproject.toml), 
  // workspace settings, or have explicit Klaus settings.
  // Example: Basic detection for ESLint/Prettier
  let command: string | null = null;
  let requiresApproval = false; // Linting is usually safe

  // Simplistic check - needs proper config lookup
  if (/* is Node project */) { 
      // Check for eslint config, package.json scripts etc.
      if (fix) {
          command = `npx eslint --fix "${path}"`; 
          requiresApproval = true; // Fixing modifies files
      } else {
          command = `npx eslint "${path}"`;
      }
      // Could also add Prettier check: command = `npx prettier --check "${path}"` (or --write for fix)
  } else if (/* is Python project */) {
      // Check for flake8, pylint, black config
      if (fix) {
           // Example: Black formatter
           command = `python -m black "${path}"`;
           requiresApproval = true;
      } else {
          // Example: Flake8 linter
          command = `python -m flake8 "${path}"`;
      }
  }
  // Add more languages/linters...

  if (!command) {
    throw new Error(`Could not determine appropriate linter/formatter for path: ${path}`);
  }

  // 2. Execute the Command (using existing infrastructure if possible)
  // This should ideally use the same mechanism as the <execute_command> tool
  // to leverage terminal management, output streaming, error handling etc.
  try {
    // Assuming runTerminalCommandInternal handles execution and returns output/status
    const result = await runTerminalCommandInternal(command, requiresApproval); 
    
    // 3. Format and Return Result
    // Could return raw output, or parse it into structured issues if possible
    return { 
        output: result.stdout + (result.stderr ? `\nSTDERR:\n${result.stderr}`: ''), 
        success: result.exitCode === 0 // Define success criteria
    }; 
  } catch (error: any) {
     console.error("Linter execution failed:", error);
     // Return error information
     return { output: `Error executing linter: ${error.message}`, success: false };
  }
}


This provides a starting point for the design. We would need to refine the parsing logic, error handling, configuration management, and interactions between the extension, backend, and LLM for each feature.

Which of these (or other suggestions) would you like to focus on designing or implementing in more detail first?
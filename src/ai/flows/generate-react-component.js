'use server';
/**
 * @fileOverview A React component generation AI agent using Genkit (primarily Gemini).
 * This flow logic is invoked by the generateReactComponentTool via the exported wrapper function.
 *
 * - generateReactComponent - The exported async function wrapper to invoke the flow logic.
 * - GenerateReactComponentInput - The input type (imported from schema file).
 * - GenerateReactComponentOutput - The return type (imported from schema file).
 */
import { ai as defaultAiInstance } from '@/ai/ai-instance'; // Import the globally configured ai instance
// Import Schemas and Types from the new shared schema file
import { GenerateReactComponentInputSchema, GenerateReactComponentOutputSchema } from '@/ai/schemas/react-component-schemas'; // Updated import path
// --- Schema definitions are removed from here ---
// --- Type exports are now imported from the schema file ---
// Export the async wrapper function - This is allowed in 'use server' files.
export async function generateReactComponent(input, aiInstance = defaultAiInstance // Accept an AI instance, default to the global one
) {
    const flowId = `gen-react-wrapper-${Date.now()}`;
    const instanceType = aiInstance === defaultAiInstance ? 'default' : 'passed-in';
    console.log(`[${flowId}] generateReactComponent wrapper called with input description: "${input.description.substring(0, 50)}...". Using ${instanceType} AI instance.`);
    const geminiPlugin = aiInstance.registry.lookupPlugin('googleai');
    if (!geminiPlugin) {
        console.error(`[${flowId}] Error: The provided (${instanceType}) Genkit instance does *not* have the Gemini AI provider (googleai plugin) configured. Cannot generate component.`);
        throw new Error(`The AI instance used for generation (type: ${instanceType}) does not have the Gemini 'googleai' plugin configured.`);
    }
    console.log(`[${flowId}] Confirmed: The provided (${instanceType}) Genkit instance has the Gemini plugin.`);
    try {
        console.log(`[${flowId}] Executing generateReactComponentFlow logic via wrapper using the ${instanceType} instance...`);
        // Call the internal flow logic directly
        const result = await generateReactComponentFlow(input, flowId, aiInstance);
        console.log(`[${flowId}] generateReactComponentFlow logic completed via wrapper. Result code length: ${result.componentCode?.length}`);
        return result;
    }
    catch (error) {
        console.error(`[${flowId}] Error executing generateReactComponentFlow logic within wrapper:`, error);
        throw error;
    }
}
// Define the prompt for component generation (internal, not exported)
// Uses the imported GenerateReactComponentInputSchema and GenerateReactComponentOutputSchema
const prompt = defaultAiInstance.definePrompt({
    name: 'generateReactComponentPrompt',
    input: {
        schema: GenerateReactComponentInputSchema, // Use imported schema
    },
    output: {
        schema: GenerateReactComponentOutputSchema, // Use imported schema
    },
    // Keep model hardcoded here for now, could be made dynamic later
    // model: 'googleai/gemini-1.5-flash', // Example model
    prompt: `You are an expert React developer following modern best practices: TypeScript, functional components, hooks, and Next.js App Router conventions (Server Components by default unless client interactivity is needed).
You prioritize creating clean, readable, maintainable, and performant code.
You leverage ShadCN UI components (available via '@/components/ui/') where appropriate.
You use Tailwind CSS for styling using semantic utility classes and theme variables (do not override colors directly).
You use lucide-react for icons (import from 'lucide-react').

Generate a single, complete React component file based on the following description.
Output ONLY the raw TypeScript code (\`tsx\`) for the component.
Do NOT include any surrounding text, explanations, or markdown code fences (\`\`\`).

Description: {{{description}}}

Component Code:`,
});
// Define the flow using the default ai instance's registry (internal, not exported)
// This flow logic is called by the exported generateReactComponent wrapper function.
const generateReactComponentFlow = defaultAiInstance.defineFlow({
    name: 'generateReactComponentFlow', // Internal name for tracing
    inputSchema: GenerateReactComponentInputSchema, // Use imported schema
    outputSchema: GenerateReactComponentOutputSchema, // Use imported schema
}, async (input, flowId, executionAiInstance) => {
    const currentFlowId = flowId || `gen-react-flow-${Date.now()}`;
    const instanceUsed = executionAiInstance === defaultAiInstance ? 'default' : 'passed-in/execution';
    console.log(`[${currentFlowId}] generateReactComponentFlow executing with input description: "${input.description.substring(0, 50)}...". Running with ${instanceUsed} instance.`);
    try {
        // Use the default model associated with the prompt, or specify one if needed
        const modelToUse = prompt.model?.name || 'googleai/gemini-1.5-flash'; // Default model if not set on prompt
        console.log(`[${currentFlowId}] Calling generateReactComponentPrompt... Model: ${modelToUse}`);
        // Execute the prompt. Make sure the ai instance used has the model configured.
        const { output } = await prompt(input, { model: modelToUse }); // Specify model if needed
        if (!output || !output.componentCode || typeof output.componentCode !== 'string' || output.componentCode.trim().length === 0) {
            console.error(`[${currentFlowId}] Prompt returned invalid or empty output. Output received:`, output);
            throw new Error("Component generation failed: The AI model returned empty or invalid code.");
        }
        const componentCode = output.componentCode.trim();
        console.log(`[${currentFlowId}] Received component code successfully. Length: ${componentCode.length}`);
        // Return the structured output containing only the code
        return { componentCode };
    }
    catch (error) {
        console.error(`[${currentFlowId}] Error during prompt execution in generateReactComponentFlow:`, error);
        if (error instanceof Error && (error.message.includes('NOT_FOUND') || error.message.includes('model not found'))) {
            const modelName = prompt.model?.name || 'unknown';
            throw new Error(`[${currentFlowId}] Model execution failed: Model '${modelName}' not found or access denied. Check API key permissions or try a different model. Original error: ${error.message}`);
        }
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'))) {
            throw new Error(`[${currentFlowId}] API Key/Permission issue: ${error.message}.`);
        }
        // Throw a more specific error if possible, otherwise generic
        throw new Error(`[${currentFlowId}] Error in generateReactComponentFlow: ${error instanceof Error ? error.message : String(error)}`);
    }
});
//# sourceMappingURL=generate-react-component.js.map
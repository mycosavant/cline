'use server';
/**
 * @fileOverview A React component refactoring AI agent.
 *
 * - refactorReactComponent - A function that refactors a React component for readability.
 * - RefactorReactComponentInput - The input type for the refactorReactComponent function.
 * - RefactorReactComponentOutput - The return type for the refactorReactComponent function.
 */
import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
const RefactorReactComponentInputSchema = z.object({
    reactComponentCode: z
        .string()
        .describe('The React component code to be refactored.'),
    instructions: z.string().describe('Specific refactoring instructions (e.g., "use more descriptive variable names").'),
});
const RefactorReactComponentOutputSchema = z.object({
    refactoredCode: z.string().describe('The refactored React component code.'),
});
export async function refactorReactComponent(input) {
    return refactorReactComponentFlow(input);
}
const prompt = ai.definePrompt({
    name: 'refactorReactComponentPrompt',
    input: {
        schema: z.object({
            reactComponentCode: z
                .string()
                .describe('The React component code to be refactored.'),
            instructions: z.string().describe('Specific refactoring instructions (e.g., "use more descriptive variable names").'),
        }),
    },
    output: {
        schema: z.object({
            refactoredCode: z.string().describe('The refactored React component code.'),
        }),
    },
    prompt: `You are an expert React developer specializing in refactoring code for readability and maintainability.

You will receive a React component and instructions on how to refactor it. Your goal is to improve the code quality based on those instructions.

React Component:
{{{reactComponentCode}}}

Instructions:
{{{instructions}}}

Refactored Code:`,
});
const refactorReactComponentFlow = ai.defineFlow({
    name: 'refactorReactComponentFlow',
    inputSchema: RefactorReactComponentInputSchema,
    outputSchema: RefactorReactComponentOutputSchema,
}, async (input) => {
    const { output } = await prompt(input);
    return output;
});
//# sourceMappingURL=refactor-react-component.js.map
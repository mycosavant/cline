
'use server';
/**
 * @fileOverview Shared Zod schemas and TypeScript types for React component generation.
 * Used by both the generation flow and the generation tool.
 */

import { z } from 'genkit'; // Use Genkit's built-in z

// Define and Export Input Schema: Description of the component
export const GenerateReactComponentInputSchema = z.object({
  description: z.string().describe('The description of the React component to generate.'),
});
export type GenerateReactComponentInput = z.infer<typeof GenerateReactComponentInputSchema>;

// Define and Export Output Schema: The generated code
export const GenerateReactComponentOutputSchema = z.object({
  componentCode: z.string().describe('The generated React component code. Output only the raw code, without any markdown formatting or explanations.'),
});
export type GenerateReactComponentOutput = z.infer<typeof GenerateReactComponentOutputSchema>;

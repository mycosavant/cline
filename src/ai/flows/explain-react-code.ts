'use server';
/**
 * @fileOverview An AI agent that explains React code.
 *
 * - explainReactCode - A function that handles the React code explanation process.
 * - ExplainReactCodeInput - The input type for the explainReactCode function.
 * - ExplainReactCodeOutput - The return type for the explainReactCode function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExplainReactCodeInputSchema = z.object({
  reactCode: z.string().describe('The React code to explain.'),
});
export type ExplainReactCodeInput = z.infer<typeof ExplainReactCodeInputSchema>;

const ExplainReactCodeOutputSchema = z.object({
  explanation: z.string().describe('The explanation of the React code.'),
});
export type ExplainReactCodeOutput = z.infer<typeof ExplainReactCodeOutputSchema>;

export async function explainReactCode(input: ExplainReactCodeInput): Promise<ExplainReactCodeOutput> {
  return explainReactCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainReactCodePrompt',
  input: {
    schema: z.object({
      reactCode: z.string().describe('The React code to explain.'),
    }),
  },
  output: {
    schema: z.object({
      explanation: z.string().describe('The explanation of the React code.'),
    }),
  },
  prompt: `You are an expert React developer. Please explain the following React code in detail:\n\n{{reactCode}}`,
});

const explainReactCodeFlow = ai.defineFlow<
  typeof ExplainReactCodeInputSchema,
  typeof ExplainReactCodeOutputSchema
>({
  name: 'explainReactCodeFlow',
  inputSchema: ExplainReactCodeInputSchema,
  outputSchema: ExplainReactCodeOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});


'use server';
/**
 * @fileOverview Genkit tool for generating React components. Defines the schemas used by the tool and flow.
 */

import { ai } from '@/ai/ai-instance';
// Import the *exported async function* from the flow file to execute the logic
import { generateReactComponent } from '@/ai/flows/generate-react-component';
// Import Schemas and Types from the new shared schema file
import {
    GenerateReactComponentInputSchema,
    GenerateReactComponentOutputSchema,
    type GenerateReactComponentInput,
    type GenerateReactComponentOutput
} from '@/ai/schemas/react-component-schemas'; // Updated import path

// --- Schema definitions are removed from here ---


// Define the tool using the schemas defined in *this* file
export const generateReactComponentTool = ai.defineTool(
  {
    name: 'generateReactComponentTool',
    description: 'Generates a React component based on a user description. Use this tool only when the user explicitly asks to generate a React component file or code.',
    inputSchema: GenerateReactComponentInputSchema, // Use schema defined above
    outputSchema: GenerateReactComponentOutputSchema, // Use schema defined above
  },
  async (input) => {
    // The tool's function calls the *exported async wrapper function* from the flow file
    const flowId = `tool-gen-react-${Date.now()}`;
    console.log(`[${flowId}] generateReactComponentTool invoked with description: "${input.description.substring(0, 50)}..."`);
    try {
       // Call the exported wrapper function
      const result = await generateReactComponent(input, ai); // Pass input and the ai instance
      console.log(`[${flowId}] generateReactComponent wrapper completed via tool. Result code length: ${result.componentCode?.length}`);
      return result; // Return the component code structured as { componentCode: "..." }
    } catch (error) {
       console.error(`[${flowId}] Error calling generateReactComponent wrapper function within tool:`, error);
       // Re-throw the error so Genkit can handle/report it
       throw error;
    }
  }
);

// Export the types again from here for convenience if other modules import the tool
// and need the types directly.
export type { GenerateReactComponentInput, GenerateReactComponentOutput };

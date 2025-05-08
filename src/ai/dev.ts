
import '@/ai/flows/refactor-react-component.ts';
import '@/ai/flows/explain-react-code.ts';
// No longer need to import generate-react-component flow directly for dev,
// as it's typically invoked via the chat API using the tool.
// import '@/ai/flows/generate-react-component.ts';

// Import the tool if you want to test it directly via Genkit UI/CLI (optional)
import '@/ai/tools/generate-react-component-tool.ts';

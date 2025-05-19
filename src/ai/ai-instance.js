import { genkit, googleAI } from 'genkit';
// Removed: import { NextjsPlugin } from '@genkit-ai/next'; // This export does not exist in recent versions
// IMPORTANT: This instance might be used server-side OR client-side depending on the flow.
// We prioritize server-side keys (process.env) but allow fallback to client-side
// keys (NEXT_PUBLIC_) if necessary, though client-side usage should be minimized
// and secured appropriately if handling sensitive data.
// Check for server-side key first, then client-side (public) key
const geminiApiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;
if (geminiApiKey) {
    console.log("Gemini API Key found (using server-side or client-side env var). Initializing googleAI plugin.");
}
else {
    console.warn("No Gemini API Key found in environment variables (GOOGLE_GENAI_API_KEY or NEXT_PUBLIC_GOOGLE_GENAI_API_KEY). googleAI plugin will not be initialized.");
}
// Initialize Genkit globally with necessary plugins
const ai = genkit({
    plugins: [
        // Conditionally add googleAI plugin only if an API key is found
        ...(geminiApiKey ? [googleAI({ apiKey: geminiApiKey })] : []),
        // Removed: NextjsPlugin(), // Next.js integration seems implicit now or handled differently
    ],
    logLevel: 'debug', // Set log level for development/debugging
    enableTracingAndMetrics: true, // Enable OpenTelemetry tracing
});
export { ai }; // Export the initialized instance
//# sourceMappingURL=ai-instance.js.map
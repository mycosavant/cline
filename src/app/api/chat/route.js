/**
 * @fileOverview API route handler for chat interactions.
 * Handles requests from the chat interface, interacts with AI services (Genkit for Gemini, OpenRouter),
 * provides tools (like component generation) to Gemini, and returns responses.
 */
import { NextResponse } from 'next/server';
import { generateChatCompletion as generateOpenRouterChatCompletion } from '@/services/open-router';
// Removed direct import of generateReactComponent flow - it's now invoked via the tool
import { ai as defaultGenkitInstance } from '@/ai/ai-instance';
import { z } from 'genkit';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// Import the newly created tool
import { generateReactComponentTool } from '@/ai/tools/generate-react-component-tool';
// Define a simple chat schema for direct Gemini calls (Potentially unused now, Genkit handles structure)
const GeminiChatInputSchema = z.array(z.object({
    role: z.enum(['user', 'model']), // Gemini uses 'model' for assistant
    content: z.string(),
}));
const GeminiChatOutputSchema = z.string();
export async function POST(request) {
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`[${requestId}] Received POST request to /api/chat`);
    try {
        const body = await request.json();
        console.log(`[${requestId}] Parsed request body:`, { messagesCount: body.messages?.length, settings: body.settings });
        const messages = body.messages;
        const settings = body.settings;
        if (!messages || messages.length === 0) {
            console.warn(`[${requestId}] Bad request: Messages are required.`);
            return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
        }
        if (!settings || !settings.provider) {
            console.warn(`[${requestId}] Bad request: AI provider settings are required.`);
            return NextResponse.json({ error: 'AI provider settings are required' }, { status: 400 });
        }
        const latestUserMessage = messages[messages.length - 1];
        console.log(`[${requestId}] Latest user message:`, latestUserMessage.content.substring(0, 100) + '...');
        let effectiveAiInstance = defaultGenkitInstance;
        let isGeminiConfigured = false;
        let geminiConfigErrorReason = "Gemini provider not selected or configuration check not run.";
        // --- Gemini Configuration Check ---
        if (settings.provider === 'gemini') {
            const serverSideGeminiKey = process.env.GOOGLE_GENAI_API_KEY;
            const clientSideGeminiKey = process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;
            const effectiveServerGeminiKey = serverSideGeminiKey || clientSideGeminiKey;
            const globalGeminiPlugin = defaultGenkitInstance.registry.lookupPlugin('googleai');
            if (globalGeminiPlugin) {
                console.log(`[${requestId}] Global Genkit instance has Gemini plugin.`);
                isGeminiConfigured = true;
                geminiConfigErrorReason = "";
            }
            else if (settings.geminiApiKey) {
                console.log(`[${requestId}] Global Genkit instance lacks Gemini plugin. Creating temporary instance with user-provided key.`);
                try {
                    const temporaryAiInstance = genkit({
                        plugins: [googleAI({ apiKey: settings.geminiApiKey })],
                        logLevel: 'debug',
                        enableTracingAndMetrics: true,
                    });
                    if (temporaryAiInstance.registry.lookupPlugin('googleai')) {
                        effectiveAiInstance = temporaryAiInstance;
                        isGeminiConfigured = true;
                        geminiConfigErrorReason = "";
                        console.log(`[${requestId}] Temporary Genkit instance created successfully with Gemini plugin.`);
                    }
                    else {
                        console.error(`[${requestId}] Failed to configure temporary Genkit instance with user key (plugin registration check failed).`);
                        geminiConfigErrorReason = "Failed to register Gemini plugin in temporary instance using user key.";
                        isGeminiConfigured = false;
                    }
                }
                catch (tempInstanceError) {
                    console.error(`[${requestId}] Failed to create temporary Genkit instance with user key:`, tempInstanceError);
                    geminiConfigErrorReason = `Error creating temporary instance with user key: ${tempInstanceError.message}`;
                    isGeminiConfigured = false;
                }
            }
            else if (effectiveServerGeminiKey) {
                console.warn(`[${requestId}] Global Genkit instance lacks Gemini plugin, but a server-side key exists. Attempting to create temporary instance with server key.`);
                try {
                    const tempInstance = genkit({
                        plugins: [googleAI({ apiKey: effectiveServerGeminiKey })],
                        logLevel: 'debug',
                        enableTracingAndMetrics: true,
                    });
                    if (tempInstance.registry.lookupPlugin('googleai')) {
                        effectiveAiInstance = tempInstance;
                        isGeminiConfigured = true;
                        geminiConfigErrorReason = "";
                        console.log(`[${requestId}] Successfully configured a temporary instance with server-side key.`);
                    }
                    else {
                        console.error(`[${requestId}] Failed to configure temporary instance with server key (plugin registration check failed).`);
                        geminiConfigErrorReason = "Failed to register Gemini plugin in temporary instance using server key.";
                        isGeminiConfigured = false;
                    }
                }
                catch (fallbackError) {
                    console.error(`[${requestId}] Failed to configure instance with server-side key as fallback:`, fallbackError);
                    geminiConfigErrorReason = `Error creating temporary instance with server key: ${fallbackError.message}`;
                    isGeminiConfigured = false;
                }
            }
            else {
                console.warn(`[${requestId}] Gemini provider selected, but no API key is configured (neither server-side nor in settings).`);
                geminiConfigErrorReason = "No API key found (server or settings) and global instance lacks plugin.";
                isGeminiConfigured = false;
            }
            console.log(`[${requestId}] Gemini Config Check Complete. Using ${effectiveAiInstance === defaultGenkitInstance ? 'global' : 'temporary'} Genkit instance. isGeminiConfigured: ${isGeminiConfigured}. ${geminiConfigErrorReason ? `Reason if false: ${geminiConfigErrorReason}` : ''}`);
        }
        else {
            console.log(`[${requestId}] Provider is not Gemini (${settings.provider}). Skipping Gemini configuration check.`);
            geminiConfigErrorReason = "Gemini provider not selected.";
            isGeminiConfigured = false;
        }
        // --- Keyword-based Routing REMOVED ---
        // Component generation is now handled via tool calling in the Gemini provider section
        // --- Provider-based Routing (General Chat) ---
        console.log(`[${requestId}] Routing to general chat with provider: ${settings.provider}`);
        // 1. Gemini Provider
        if (settings.provider === 'gemini') {
            console.log(`[${requestId}] Using Gemini provider for general chat.`);
            if (!isGeminiConfigured) {
                console.warn(`[${requestId}] Gemini provider selected for chat, but not configured. Reason: ${geminiConfigErrorReason}`);
                return NextResponse.json({
                    role: 'assistant',
                    content: `Cannot use Gemini chat: ${geminiConfigErrorReason || "Gemini provider is not correctly configured. Check API key and logs."}`,
                }, { status: 400 });
            }
            console.log(`[${requestId}] Gemini is configured. Using ${effectiveAiInstance === defaultGenkitInstance ? 'global' : 'temporary'} Genkit instance for chat.`);
            const geminiModelName = settings.geminiModel || 'gemini-1.5-flash'; // Default to flash if not set
            console.log(`[${requestId}] Selected Gemini model for chat: ${geminiModelName}`);
            // Format messages for Genkit generate
            const genkitMessages = messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                content: [{ text: msg.content }],
            }));
            console.log(`[${requestId}] Formatted ${genkitMessages.length} messages for Genkit generate.`);
            // Add system prompt to guide the model, especially about tool use
            const systemPrompt = `You are an AI Pair Programmer assistant. Help users with their coding questions.
You have access to a tool called 'generateReactComponentTool'.
ONLY use this tool if the user explicitly asks you to generate a React component code or file.
Do NOT use the tool for explaining code, refactoring code, or answering general questions.
If you use the tool, present the resulting code to the user clearly.`;
            try {
                const history = genkitMessages.slice(0, -1);
                const promptContent = genkitMessages[genkitMessages.length - 1]?.content;
                if (!promptContent) {
                    console.error(`[${requestId}] Could not extract prompt from messages.`);
                    throw new Error("Invalid message structure: could not extract prompt.");
                }
                console.log(`[${requestId}] Calling Gemini via Genkit generate with model ${geminiModelName}. History length: ${history.length}, Prompt:`, promptContent[0].text.substring(0, 50) + '...');
                // Use the EFFECTIVE AI instance and provide the tool
                const response = await effectiveAiInstance.generate({
                    model: `googleai/${geminiModelName}`,
                    system: systemPrompt, // Add the system prompt
                    history: history,
                    prompt: promptContent,
                    tools: [generateReactComponentTool], // Make the tool available
                    config: { temperature: 0.7 },
                    output: { format: "text" }, // Expect text or tool output
                });
                // Check the response structure - it might contain text or tool output
                let assistantMessage = response.text; // Default to text response
                let generatedArtifact = undefined;
                // Check if the model decided to use the tool
                if (response.output?.content?.[0]?.toolResponse) {
                    const toolResponse = response.output.content[0].toolResponse;
                    console.log(`[${requestId}] Model used tool: ${toolResponse.part.toolRequest.name}. Output:`, toolResponse.part.toolResponse.output);
                    // Assuming the tool output schema is { componentCode: string }
                    if (toolResponse.part.toolResponse.output?.componentCode) {
                        generatedArtifact = toolResponse.part.toolResponse.output.componentCode;
                        // Provide a standard message indicating the artifact was generated
                        assistantMessage = "OK, I've generated the React component code for you:";
                    }
                    else {
                        // Handle cases where the tool might have run but didn't produce the expected output
                        console.warn(`[${requestId}] Tool response from '${toolResponse.part.toolRequest.name}' did not contain expected 'componentCode'. Tool output:`, toolResponse.part.toolResponse.output);
                        assistantMessage = "I tried to generate the component, but encountered an issue retrieving the code.";
                    }
                }
                else if (!assistantMessage) {
                    // If it wasn't a tool response and there's no text, something's wrong
                    console.warn(`[${requestId}] Gemini response was empty or undefined and not a tool response.`);
                    assistantMessage = "Sorry, I received an empty response from Gemini.";
                    // No need to set status 500 here, let the client decide based on content
                }
                console.log(`[${requestId}] Gemini response processed. Message length: ${assistantMessage?.length}, Artifact present: ${!!generatedArtifact}`);
                console.log(`[${requestId}] Sending Gemini response to client.`);
                // Send back both the text message and the artifact if it exists
                return NextResponse.json({
                    role: 'assistant',
                    content: assistantMessage,
                    artifact: generatedArtifact, // Include artifact if generated
                });
            }
            catch (geminiError) {
                console.error(`[${requestId}] Error calling Gemini via Genkit generate:`, geminiError);
                const errorMessage = geminiError instanceof Error ? geminiError.message : String(geminiError);
                if (errorMessage?.includes('API key not valid') || errorMessage?.includes('PERMISSION_DENIED')) {
                    return NextResponse.json({
                        role: 'assistant',
                        content: `Sorry, the configured Gemini API key appears to be invalid or lacks permissions. Please check your settings or key permissions. Error: ${errorMessage}`,
                    }, { status: 400 });
                }
                if (errorMessage?.includes('permission to use') || errorMessage?.includes('NOT_FOUND') || errorMessage.includes('model not found')) {
                    return NextResponse.json({
                        role: 'assistant',
                        content: `Sorry, there might be an issue accessing the selected Gemini model (${geminiModelName}). Please ensure your API key has permissions for this model or try a different model. Error: ${errorMessage}`,
                    }, { status: 400 });
                }
                return NextResponse.json({
                    role: 'assistant',
                    content: `Sorry, I encountered an error communicating with Gemini: ${errorMessage || 'Unknown error'}`,
                }, { status: 500 });
            }
        }
        // 2. OpenRouter Provider
        else if (settings.provider === 'openrouter') {
            console.log(`[${requestId}] Using OpenRouter provider for chat.`);
            const serverSideOpenRouterKey = process.env.OPENROUTER_API_KEY;
            const clientSideOpenRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
            const effectiveOpenRouterApiKey = serverSideOpenRouterKey || clientSideOpenRouterKey || settings.openRouterApiKey;
            const effectiveOpenRouterModel = settings.openRouterModel || process.env.NEXT_PUBLIC_OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
            if (!effectiveOpenRouterApiKey) {
                console.warn(`[${requestId}] OpenRouter API key is missing.`);
                return NextResponse.json({
                    role: 'assistant',
                    content: 'OpenRouter API key is missing. Please configure it in environment variables or settings.'
                }, { status: 400 });
            }
            if (!effectiveOpenRouterModel) {
                console.warn(`[${requestId}] OpenRouter model is missing.`);
                return NextResponse.json({
                    role: 'assistant',
                    content: 'OpenRouter model is missing. Please select a model in settings.'
                }, { status: 400 });
            }
            console.log(`[${requestId}] OpenRouter API key found (effective). Model: ${effectiveOpenRouterModel}`);
            const config = {
                apiKey: effectiveOpenRouterApiKey,
                model: effectiveOpenRouterModel,
            };
            console.log(`[${requestId}] OpenRouter config:`, { model: config.model, baseUrl: config.baseUrl || 'default' });
            try {
                console.log(`[${requestId}] Calling OpenRouter chat completion service...`);
                const response = await generateOpenRouterChatCompletion(messages, config);
                console.log(`[${requestId}] OpenRouter response received. Length: ${response.content?.length}`);
                console.log(`[${requestId}] Sending OpenRouter response to client.`);
                return NextResponse.json({
                    role: 'assistant',
                    content: response.content,
                    // Note: OpenRouter doesn't have tool support in this setup, so artifact is always undefined
                });
            }
            catch (orError) {
                console.error(`[${requestId}] Error calling OpenRouter chat completion:`, orError);
                const errorMessage = orError instanceof Error ? orError.message : String(orError);
                if (errorMessage?.includes('is not a valid model ID') || errorMessage?.includes('Model not found')) {
                    return NextResponse.json({
                        role: 'assistant',
                        content: `Sorry, the selected OpenRouter model (${effectiveOpenRouterModel}) seems invalid or unavailable. Please choose a different model in settings. Error: ${errorMessage}`,
                    }, { status: 400 });
                }
                if (errorMessage?.includes('Invalid API Key') || errorMessage?.includes('401')) {
                    return NextResponse.json({
                        role: 'assistant',
                        content: `Sorry, the configured OpenRouter API key appears to be invalid. Please check your settings. Error: ${errorMessage}`,
                    }, { status: 400 });
                }
                return NextResponse.json({
                    role: 'assistant',
                    content: `Sorry, I encountered an error communicating with OpenRouter: ${errorMessage || 'Unknown error'}`,
                }, { status: 500 });
            }
        }
        // Fallback for invalid provider
        console.error(`[${requestId}] Invalid AI provider specified: ${settings.provider}`);
        return NextResponse.json({
            role: 'assistant',
            content: 'Invalid AI provider specified in settings.'
        }, { status: 400 });
    }
    catch (error) {
        console.error(`[${requestId}] Unhandled error in /api/chat:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            role: 'assistant',
            content: `An unexpected error occurred while processing your request: ${errorMessage || 'Unknown server error'}`
        }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map
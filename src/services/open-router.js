'use server';
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
// Use NEXT_PUBLIC_ prefixed env var for default model
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';
/**
 * Asynchronously communicates with the OpenRouter API to generate content based on a given message history.
 *
 * @param messages The chat history, including the latest user prompt.
 * @param config The configuration for accessing the OpenRouter API.
 * @returns A promise that resolves to an OpenRouterResponse object containing the generated content.
 * @throws Will throw an error if the API call fails.
 */
export async function generateChatCompletion(messages, config) {
    const serviceCallId = `or-service-${Date.now()}`;
    console.log(`[${serviceCallId}] generateChatCompletion service called.`);
    const { apiKey, baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL } = config;
    if (!apiKey) {
        // This check should ideally happen before calling this function (e.g., in the API route)
        console.error(`[${serviceCallId}] OpenRouter API key is missing in config.`);
        throw new Error('OpenRouter API key is missing.');
    }
    console.log(`[${serviceCallId}] Using OpenRouter config:`, { model, baseUrl });
    // Format messages for the OpenRouter API
    const apiMessages = messages.map(({ id, role, content }) => ({ role, content })); // Exclude id
    console.log(`[${serviceCallId}] Formatted ${apiMessages.length} messages for OpenRouter API.`);
    const apiUrl = `${baseUrl}/chat/completions`;
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Optional: Add headers recommended by OpenRouter for identifying your app
        // 'HTTP-Referer': $YOUR_SITE_URL, // Your site URL
        // 'X-Title': $YOUR_SITE_NAME, // Your site name
    };
    const body = JSON.stringify({
        model: model,
        messages: apiMessages,
        // Add other parameters as needed, e.g., temperature, max_tokens
    });
    console.log(`[${serviceCallId}] Sending request to OpenRouter API: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: body,
        });
        console.log(`[${serviceCallId}] OpenRouter API response status: ${response.status}`);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[${serviceCallId}] OpenRouter API Error (${response.status}):`, errorBody);
            // Provide a more user-friendly error message if possible
            let errorMessage = `OpenRouter API request failed with status ${response.status}`;
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.error?.message) {
                    errorMessage += `: ${errorJson.error.message}`;
                }
                else if (errorJson.detail) { // Sometimes OpenRouter uses 'detail'
                    errorMessage += `: ${JSON.stringify(errorJson.detail)}`;
                }
                else {
                    errorMessage += `: ${errorBody}`;
                }
            }
            catch (e) {
                errorMessage += `: ${errorBody}`; // Fallback if error body is not JSON
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();
        console.log(`[${serviceCallId}] OpenRouter API response data received.`);
        // Extract the assistant's reply
        const assistantMessage = data.choices?.[0]?.message?.content;
        if (!assistantMessage) {
            console.error(`[${serviceCallId}] Invalid response format from OpenRouter:`, JSON.stringify(data, null, 2));
            throw new Error('Failed to parse assistant message from OpenRouter response.');
        }
        console.log(`[${serviceCallId}] Successfully extracted assistant message. Length: ${assistantMessage.trim().length}`);
        return {
            content: assistantMessage.trim(),
        };
    }
    catch (error) {
        console.error(`[${serviceCallId}] Error during OpenRouter API call:`, error);
        // Re-throw the error to be handled by the caller (API route)
        throw error;
    }
}
//# sourceMappingURL=open-router.js.map
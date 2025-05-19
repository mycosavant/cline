import { litellmDefaultModelId, litellmDefaultModelInfo } from "../../shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { RouterProvider } from "./router-provider";
/**
 * LiteLLM provider handler
 *
 * This handler uses the LiteLLM API to proxy requests to various LLM providers.
 * It follows the OpenAI API format for compatibility.
 */
export class LiteLLMHandler extends RouterProvider {
    constructor(options) {
        super({
            options,
            name: "litellm",
            baseURL: `${options.litellmBaseUrl || "http://localhost:4000"}`,
            apiKey: options.litellmApiKey || "dummy-key",
            modelId: options.litellmModelId,
            defaultModelId: litellmDefaultModelId,
            defaultModelInfo: litellmDefaultModelInfo,
        });
    }
    async *createMessage(systemPrompt, messages) {
        const { id: modelId, info } = await this.fetchModel();
        const openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        // Required by some providers; others default to max tokens allowed
        let maxTokens = info.maxTokens ?? undefined;
        const requestOptions = {
            model: modelId,
            max_tokens: maxTokens,
            messages: openAiMessages,
            stream: true,
            stream_options: {
                include_usage: true,
            },
        };
        if (this.supportsTemperature(modelId)) {
            requestOptions.temperature = this.options.modelTemperature ?? 0;
        }
        try {
            const { data: completion } = await this.client.chat.completions.create(requestOptions).withResponse();
            let lastUsage;
            for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta;
                const usage = chunk.usage;
                if (delta?.content) {
                    yield { type: "text", text: delta.content };
                }
                if (usage) {
                    lastUsage = usage;
                }
            }
            if (lastUsage) {
                const usageData = {
                    type: "usage",
                    inputTokens: lastUsage.prompt_tokens || 0,
                    outputTokens: lastUsage.completion_tokens || 0,
                };
                yield usageData;
            }
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`LiteLLM streaming error: ${error.message}`);
            }
            throw error;
        }
    }
    async completePrompt(prompt) {
        const { id: modelId, info } = await this.fetchModel();
        try {
            const requestOptions = {
                model: modelId,
                messages: [{ role: "user", content: prompt }],
            };
            if (this.supportsTemperature(modelId)) {
                requestOptions.temperature = this.options.modelTemperature ?? 0;
            }
            requestOptions.max_tokens = info.maxTokens;
            const response = await this.client.chat.completions.create(requestOptions);
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`LiteLLM completion error: ${error.message}`);
            }
            throw error;
        }
    }
}
//# sourceMappingURL=litellm.js.map
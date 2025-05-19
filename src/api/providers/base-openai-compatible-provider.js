import OpenAI from "openai";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { DEFAULT_HEADERS } from "./constants";
import { BaseProvider } from "./base-provider";
export class BaseOpenAiCompatibleProvider extends BaseProvider {
    providerName;
    baseURL;
    defaultTemperature;
    defaultProviderModelId;
    providerModels;
    options;
    client;
    constructor({ providerName, baseURL, defaultProviderModelId, providerModels, defaultTemperature, ...options }) {
        super();
        this.providerName = providerName;
        this.baseURL = baseURL;
        this.defaultProviderModelId = defaultProviderModelId;
        this.providerModels = providerModels;
        this.defaultTemperature = defaultTemperature ?? 0;
        this.options = options;
        if (!this.options.apiKey) {
            throw new Error("API key is required");
        }
        this.client = new OpenAI({
            baseURL,
            apiKey: this.options.apiKey,
            defaultHeaders: DEFAULT_HEADERS,
        });
    }
    async *createMessage(systemPrompt, messages) {
        const { id: model, info: { maxTokens: max_tokens }, } = this.getModel();
        const temperature = this.options.modelTemperature ?? this.defaultTemperature;
        const params = {
            model,
            max_tokens,
            temperature,
            messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
            stream: true,
            stream_options: { include_usage: true },
        };
        const stream = await this.client.chat.completions.create(params);
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield {
                    type: "text",
                    text: delta.content,
                };
            }
            if (chunk.usage) {
                yield {
                    type: "usage",
                    inputTokens: chunk.usage.prompt_tokens || 0,
                    outputTokens: chunk.usage.completion_tokens || 0,
                };
            }
        }
    }
    async completePrompt(prompt) {
        const { id: modelId } = this.getModel();
        try {
            const response = await this.client.chat.completions.create({
                model: modelId,
                messages: [{ role: "user", content: prompt }],
            });
            return response.choices[0]?.message.content || "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`${this.providerName} completion error: ${error.message}`);
            }
            throw error;
        }
    }
    getModel() {
        const id = this.options.apiModelId && this.options.apiModelId in this.providerModels
            ? this.options.apiModelId
            : this.defaultProviderModelId;
        return { id, info: this.providerModels[id] };
    }
}
//# sourceMappingURL=base-openai-compatible-provider.js.map
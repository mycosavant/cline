import OpenAI from "openai";
import { openRouterDefaultModelId, openRouterDefaultModelInfo, PROMPT_CACHING_MODELS, REASONING_MODELS, } from "../../shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { convertToR1Format } from "../transform/r1-format";
import { addCacheBreakpoints as addAnthropicCacheBreakpoints } from "../transform/caching/anthropic";
import { addCacheBreakpoints as addGeminiCacheBreakpoints } from "../transform/caching/gemini";
import { getModelParams } from "../index";
import { DEFAULT_HEADERS, DEEP_SEEK_DEFAULT_TEMPERATURE } from "./constants";
import { BaseProvider } from "./base-provider";
import { getModels } from "./fetchers/modelCache";
import { getModelEndpoints } from "./fetchers/modelEndpointCache";
const OPENROUTER_DEFAULT_PROVIDER_NAME = "[default]";
export class OpenRouterHandler extends BaseProvider {
    options;
    client;
    models = {};
    endpoints = {};
    constructor(options) {
        super();
        this.options = options;
        const baseURL = this.options.openRouterBaseUrl || "https://openrouter.ai/api/v1";
        const apiKey = this.options.openRouterApiKey ?? "not-provided";
        this.client = new OpenAI({ baseURL, apiKey, defaultHeaders: DEFAULT_HEADERS });
    }
    async *createMessage(systemPrompt, messages) {
        let { id: modelId, maxTokens, thinking, temperature, topP, reasoningEffort, promptCache, } = await this.fetchModel();
        // Convert Anthropic messages to OpenAI format.
        let openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        // DeepSeek highly recommends using user instead of system role.
        if (modelId.startsWith("deepseek/deepseek-r1") || modelId === "perplexity/sonar-reasoning") {
            openAiMessages = convertToR1Format([{ role: "user", content: systemPrompt }, ...messages]);
        }
        const isCacheAvailable = promptCache.supported;
        // https://openrouter.ai/docs/features/prompt-caching
        if (isCacheAvailable) {
            modelId.startsWith("google")
                ? addGeminiCacheBreakpoints(systemPrompt, openAiMessages)
                : addAnthropicCacheBreakpoints(systemPrompt, openAiMessages);
        }
        // https://openrouter.ai/docs/transforms
        const completionParams = {
            model: modelId,
            ...(maxTokens && maxTokens > 0 && { max_tokens: maxTokens }),
            temperature,
            thinking, // OpenRouter is temporarily supporting this.
            top_p: topP,
            messages: openAiMessages,
            stream: true,
            stream_options: { include_usage: true },
            // Only include provider if openRouterSpecificProvider is not "[default]".
            ...(this.options.openRouterSpecificProvider &&
                this.options.openRouterSpecificProvider !== OPENROUTER_DEFAULT_PROVIDER_NAME && {
                provider: {
                    order: [this.options.openRouterSpecificProvider],
                    only: [this.options.openRouterSpecificProvider],
                    allow_fallbacks: false,
                },
            }),
            // This way, the transforms field will only be included in the parameters when openRouterUseMiddleOutTransform is true.
            ...((this.options.openRouterUseMiddleOutTransform ?? true) && { transforms: ["middle-out"] }),
            ...(REASONING_MODELS.has(modelId) && reasoningEffort && { reasoning: { effort: reasoningEffort } }),
        };
        const stream = await this.client.chat.completions.create(completionParams);
        let lastUsage = undefined;
        for await (const chunk of stream) {
            // OpenRouter returns an error object instead of the OpenAI SDK throwing an error.
            if ("error" in chunk) {
                const error = chunk.error;
                console.error(`OpenRouter API Error: ${error?.code} - ${error?.message}`);
                throw new Error(`OpenRouter API Error ${error?.code}: ${error?.message}`);
            }
            const delta = chunk.choices[0]?.delta;
            if ("reasoning" in delta && delta.reasoning && typeof delta.reasoning === "string") {
                yield { type: "reasoning", text: delta.reasoning };
            }
            if (delta?.content) {
                yield { type: "text", text: delta.content };
            }
            if (chunk.usage) {
                lastUsage = chunk.usage;
            }
        }
        if (lastUsage) {
            yield {
                type: "usage",
                inputTokens: lastUsage.prompt_tokens || 0,
                outputTokens: lastUsage.completion_tokens || 0,
                // Waiting on OpenRouter to figure out what this represents in the Gemini case
                // and how to best support it.
                // cacheReadTokens: lastUsage.prompt_tokens_details?.cached_tokens,
                reasoningTokens: lastUsage.completion_tokens_details?.reasoning_tokens,
                totalCost: lastUsage.cost || 0,
            };
        }
    }
    async fetchModel() {
        const [models, endpoints] = await Promise.all([
            getModels("openrouter"),
            getModelEndpoints({
                router: "openrouter",
                modelId: this.options.openRouterModelId,
                endpoint: this.options.openRouterSpecificProvider,
            }),
        ]);
        this.models = models;
        this.endpoints = endpoints;
        return this.getModel();
    }
    getModel() {
        const id = this.options.openRouterModelId ?? openRouterDefaultModelId;
        let info = this.models[id] ?? openRouterDefaultModelInfo;
        // If a specific provider is requested, use the endpoint for that provider.
        if (this.options.openRouterSpecificProvider && this.endpoints[this.options.openRouterSpecificProvider]) {
            info = this.endpoints[this.options.openRouterSpecificProvider];
        }
        const isDeepSeekR1 = id.startsWith("deepseek/deepseek-r1") || id === "perplexity/sonar-reasoning";
        return {
            id,
            info,
            // maxTokens, thinking, temperature, reasoningEffort
            ...getModelParams({
                options: this.options,
                model: info,
                defaultTemperature: isDeepSeekR1 ? DEEP_SEEK_DEFAULT_TEMPERATURE : 0,
            }),
            topP: isDeepSeekR1 ? 0.95 : undefined,
            promptCache: {
                supported: PROMPT_CACHING_MODELS.has(id),
            },
        };
    }
    async completePrompt(prompt) {
        let { id: modelId, maxTokens, thinking, temperature } = await this.fetchModel();
        const completionParams = {
            model: modelId,
            max_tokens: maxTokens,
            thinking,
            temperature,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            // Only include provider if openRouterSpecificProvider is not "[default]".
            ...(this.options.openRouterSpecificProvider &&
                this.options.openRouterSpecificProvider !== OPENROUTER_DEFAULT_PROVIDER_NAME && {
                provider: {
                    order: [this.options.openRouterSpecificProvider],
                    only: [this.options.openRouterSpecificProvider],
                    allow_fallbacks: false,
                },
            }),
        };
        const response = await this.client.chat.completions.create(completionParams);
        if ("error" in response) {
            const error = response.error;
            throw new Error(`OpenRouter API Error ${error?.code}: ${error?.message}`);
        }
        const completion = response;
        return completion.choices[0]?.message?.content || "";
    }
}
//# sourceMappingURL=openrouter.js.map
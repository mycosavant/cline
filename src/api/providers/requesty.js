import { requestyDefaultModelId, requestyDefaultModelInfo, } from "../../shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { calculateApiCostOpenAI } from "../../utils/cost";
import { BaseProvider } from "./base-provider";
import { DEFAULT_HEADERS } from "./constants";
import { getModels } from "./fetchers/modelCache";
import OpenAI from "openai";
export class RequestyHandler extends BaseProvider {
    options;
    models = {};
    client;
    constructor(options) {
        super();
        this.options = options;
        const apiKey = this.options.requestyApiKey ?? "not-provided";
        const baseURL = "https://router.requesty.ai/v1";
        const defaultHeaders = DEFAULT_HEADERS;
        this.client = new OpenAI({ baseURL, apiKey, defaultHeaders });
    }
    async fetchModel() {
        this.models = await getModels("requesty");
        return this.getModel();
    }
    getModel() {
        const id = this.options.requestyModelId ?? requestyDefaultModelId;
        const info = this.models[id] ?? requestyDefaultModelInfo;
        return { id, info };
    }
    processUsageMetrics(usage, modelInfo) {
        const requestyUsage = usage;
        const inputTokens = requestyUsage?.prompt_tokens || 0;
        const outputTokens = requestyUsage?.completion_tokens || 0;
        const cacheWriteTokens = requestyUsage?.prompt_tokens_details?.caching_tokens || 0;
        const cacheReadTokens = requestyUsage?.prompt_tokens_details?.cached_tokens || 0;
        const totalCost = modelInfo
            ? calculateApiCostOpenAI(modelInfo, inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens)
            : 0;
        return {
            type: "usage",
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            cacheWriteTokens: cacheWriteTokens,
            cacheReadTokens: cacheReadTokens,
            totalCost: totalCost,
        };
    }
    async *createMessage(systemPrompt, messages) {
        const model = await this.fetchModel();
        let openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        let maxTokens = undefined;
        if (this.options.includeMaxTokens) {
            maxTokens = model.info.maxTokens;
        }
        const temperature = this.options.modelTemperature;
        const completionParams = {
            model: model.id,
            max_tokens: maxTokens,
            messages: openAiMessages,
            temperature: temperature,
            stream: true,
            stream_options: { include_usage: true },
        };
        const stream = await this.client.chat.completions.create(completionParams);
        let lastUsage = undefined;
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield {
                    type: "text",
                    text: delta.content,
                };
            }
            if (delta && "reasoning_content" in delta && delta.reasoning_content) {
                yield {
                    type: "reasoning",
                    text: delta.reasoning_content || "",
                };
            }
            if (chunk.usage) {
                lastUsage = chunk.usage;
            }
        }
        if (lastUsage) {
            yield this.processUsageMetrics(lastUsage, model.info);
        }
    }
    async completePrompt(prompt) {
        const model = await this.fetchModel();
        let openAiMessages = [{ role: "system", content: prompt }];
        let maxTokens = undefined;
        if (this.options.includeMaxTokens) {
            maxTokens = model.info.maxTokens;
        }
        const temperature = this.options.modelTemperature;
        const completionParams = {
            model: model.id,
            max_tokens: maxTokens,
            messages: openAiMessages,
            temperature: temperature,
        };
        const response = await this.client.chat.completions.create(completionParams);
        return response.choices[0]?.message.content || "";
    }
}
//# sourceMappingURL=requesty.js.map
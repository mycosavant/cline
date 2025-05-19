import { GoogleGenAI, } from "@google/genai";
import { geminiDefaultModelId, geminiModels } from "../../shared/api";
import { safeJsonParse } from "../../shared/safeJsonParse";
import { convertAnthropicContentToGemini, convertAnthropicMessageToGemini } from "../transform/gemini-format";
import { BaseProvider } from "./base-provider";
export class GeminiHandler extends BaseProvider {
    options;
    client;
    constructor({ isVertex, ...options }) {
        super();
        this.options = options;
        const project = this.options.vertexProjectId ?? "not-provided";
        const location = this.options.vertexRegion ?? "not-provided";
        const apiKey = this.options.geminiApiKey ?? "not-provided";
        this.client = this.options.vertexJsonCredentials
            ? new GoogleGenAI({
                vertexai: true,
                project,
                location,
                googleAuthOptions: {
                    credentials: safeJsonParse(this.options.vertexJsonCredentials, undefined),
                },
            })
            : this.options.vertexKeyFile
                ? new GoogleGenAI({
                    vertexai: true,
                    project,
                    location,
                    googleAuthOptions: { keyFile: this.options.vertexKeyFile },
                })
                : isVertex
                    ? new GoogleGenAI({ vertexai: true, project, location })
                    : new GoogleGenAI({ apiKey });
    }
    async *createMessage(systemInstruction, messages) {
        const { id: model, thinkingConfig, maxOutputTokens, info } = this.getModel();
        const contents = messages.map(convertAnthropicMessageToGemini);
        const config = {
            systemInstruction,
            httpOptions: this.options.googleGeminiBaseUrl ? { baseUrl: this.options.googleGeminiBaseUrl } : undefined,
            thinkingConfig,
            maxOutputTokens,
            temperature: this.options.modelTemperature ?? 0,
        };
        const params = { model, contents, config };
        const result = await this.client.models.generateContentStream(params);
        let lastUsageMetadata;
        for await (const chunk of result) {
            if (chunk.text) {
                yield { type: "text", text: chunk.text };
            }
            if (chunk.usageMetadata) {
                lastUsageMetadata = chunk.usageMetadata;
            }
        }
        if (lastUsageMetadata) {
            const inputTokens = lastUsageMetadata.promptTokenCount ?? 0;
            const outputTokens = lastUsageMetadata.candidatesTokenCount ?? 0;
            const cacheReadTokens = lastUsageMetadata.cachedContentTokenCount;
            const reasoningTokens = lastUsageMetadata.thoughtsTokenCount;
            yield {
                type: "usage",
                inputTokens,
                outputTokens,
                cacheReadTokens,
                reasoningTokens,
                totalCost: this.calculateCost({ info, inputTokens, outputTokens, cacheReadTokens }),
            };
        }
    }
    getModel() {
        let id = this.options.apiModelId ?? geminiDefaultModelId;
        let info = geminiModels[id];
        if (id?.endsWith(":thinking")) {
            id = id.slice(0, -":thinking".length);
            if (geminiModels[id]) {
                info = geminiModels[id];
                return {
                    id,
                    info,
                    thinkingConfig: this.options.modelMaxThinkingTokens
                        ? { thinkingBudget: this.options.modelMaxThinkingTokens }
                        : undefined,
                    maxOutputTokens: this.options.modelMaxTokens ?? info.maxTokens ?? undefined,
                };
            }
        }
        if (!info) {
            id = geminiDefaultModelId;
            info = geminiModels[geminiDefaultModelId];
        }
        return { id, info };
    }
    async completePrompt(prompt) {
        try {
            const { id: model } = this.getModel();
            const result = await this.client.models.generateContent({
                model,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                    httpOptions: this.options.googleGeminiBaseUrl
                        ? { baseUrl: this.options.googleGeminiBaseUrl }
                        : undefined,
                    temperature: this.options.modelTemperature ?? 0,
                },
            });
            return result.text ?? "";
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini completion error: ${error.message}`);
            }
            throw error;
        }
    }
    async countTokens(content) {
        try {
            const { id: model } = this.getModel();
            const response = await this.client.models.countTokens({
                model,
                contents: convertAnthropicContentToGemini(content),
            });
            if (response.totalTokens === undefined) {
                console.warn("Gemini token counting returned undefined, using fallback");
                return super.countTokens(content);
            }
            return response.totalTokens;
        }
        catch (error) {
            console.warn("Gemini token counting failed, using fallback", error);
            return super.countTokens(content);
        }
    }
    calculateCost({ info, inputTokens, outputTokens, cacheReadTokens = 0, }) {
        if (!info.inputPrice || !info.outputPrice || !info.cacheReadsPrice) {
            return undefined;
        }
        let inputPrice = info.inputPrice;
        let outputPrice = info.outputPrice;
        let cacheReadsPrice = info.cacheReadsPrice;
        // If there's tiered pricing then adjust the input and output token prices
        // based on the input tokens used.
        if (info.tiers) {
            const tier = info.tiers.find((tier) => inputTokens <= tier.contextWindow);
            if (tier) {
                inputPrice = tier.inputPrice ?? inputPrice;
                outputPrice = tier.outputPrice ?? outputPrice;
                cacheReadsPrice = tier.cacheReadsPrice ?? cacheReadsPrice;
            }
        }
        // Subtract the cached input tokens from the total input tokens.
        const uncachedInputTokens = inputTokens - cacheReadTokens;
        let cacheReadCost = cacheReadTokens > 0 ? cacheReadsPrice * (cacheReadTokens / 1_000_000) : 0;
        const inputTokensCost = inputPrice * (uncachedInputTokens / 1_000_000);
        const outputTokensCost = outputPrice * (outputTokens / 1_000_000);
        const totalCost = inputTokensCost + outputTokensCost + cacheReadCost;
        const trace = {
            input: { price: inputPrice, tokens: uncachedInputTokens, cost: inputTokensCost },
            output: { price: outputPrice, tokens: outputTokens, cost: outputTokensCost },
        };
        if (cacheReadTokens > 0) {
            trace.cacheRead = { price: cacheReadsPrice, tokens: cacheReadTokens, cost: cacheReadCost };
        }
        // console.log(`[GeminiHandler] calculateCost -> ${totalCost}`, trace)
        return totalCost;
    }
}
//# sourceMappingURL=gemini.js.map
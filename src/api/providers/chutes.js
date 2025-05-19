import { chutesDefaultModelId, chutesModels } from "../../shared/api";
import { BaseOpenAiCompatibleProvider } from "./base-openai-compatible-provider";
export class ChutesHandler extends BaseOpenAiCompatibleProvider {
    constructor(options) {
        super({
            ...options,
            providerName: "Chutes",
            baseURL: "https://llm.chutes.ai/v1",
            apiKey: options.chutesApiKey,
            defaultProviderModelId: chutesDefaultModelId,
            providerModels: chutesModels,
            defaultTemperature: 0.5,
        });
    }
}
//# sourceMappingURL=chutes.js.map
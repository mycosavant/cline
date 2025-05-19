import OpenAI from "openai";
import { BaseProvider } from "./base-provider";
import { getModels } from "./fetchers/modelCache";
export class RouterProvider extends BaseProvider {
    options;
    name;
    models = {};
    modelId;
    defaultModelId;
    defaultModelInfo;
    client;
    constructor({ options, name, baseURL, apiKey = "not-provided", modelId, defaultModelId, defaultModelInfo, }) {
        super();
        this.options = options;
        this.name = name;
        this.modelId = modelId;
        this.defaultModelId = defaultModelId;
        this.defaultModelInfo = defaultModelInfo;
        this.client = new OpenAI({ baseURL, apiKey });
    }
    async fetchModel() {
        this.models = await getModels(this.name, this.client.apiKey, this.client.baseURL);
        return this.getModel();
    }
    getModel() {
        const id = this.modelId ?? this.defaultModelId;
        return this.models[id]
            ? { id, info: this.models[id] }
            : { id: this.defaultModelId, info: this.defaultModelInfo };
    }
    supportsTemperature(modelId) {
        return !modelId.startsWith("openai/o3-mini");
    }
}
//# sourceMappingURL=router-provider.js.map
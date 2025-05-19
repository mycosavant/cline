import { vertexDefaultModelId, vertexModels } from "../../shared/api";
import { GeminiHandler } from "./gemini";
export class VertexHandler extends GeminiHandler {
    constructor(options) {
        super({ ...options, isVertex: true });
    }
    getModel() {
        let id = this.options.apiModelId ?? vertexDefaultModelId;
        let info = vertexModels[id];
        if (id?.endsWith(":thinking")) {
            id = id.slice(0, -":thinking".length);
            if (vertexModels[id]) {
                info = vertexModels[id];
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
            id = vertexDefaultModelId;
            info = vertexModels[vertexDefaultModelId];
        }
        return { id, info };
    }
}
//# sourceMappingURL=vertex.js.map
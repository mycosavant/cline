import { ApiHandler, ApiStream, ApiStreamUsageChunk } from "../index";
import { ApiConfiguration, ModelInfo } from "../../shared/api";
import { Anthropic } from "@anthropic-ai/sdk";

export class KlausHandler implements ApiHandler {
  constructor(options: ApiConfiguration) {}

  createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[]
  ): ApiStream {
    return {} as ApiStream;
  }

  getModel(): { id: string; info: ModelInfo } {
    return { id: "klaus-model", info: { name: "Klaus Model" } };
  }

  async getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined> {
    return undefined;
  }
}
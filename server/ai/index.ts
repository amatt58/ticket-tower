import { type AIConfig, loadAIConfig } from "./config";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOllamaProvider } from "./providers/ollama";
import { createOpenAIProvider } from "./providers/openai";
import type { AIProvider } from "./types";

export { AIOutputError, AIProviderError } from "./errors";
export { completeStructured } from "./structured";
export type {
  AIProvider,
  AIProviderName,
  ChatMessage,
  CompletionPrompt,
  CompletionResult,
} from "./types";

function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "ollama":
      return createOllamaProvider({
        baseUrl: config.ollamaBaseUrl,
        completionModel: config.completionModel,
        embeddingModel: config.embeddingModel,
      });
    case "openai":
      return createOpenAIProvider({
        // loadAIConfig guarantees the key is set for this provider
        apiKey: config.openaiApiKey as string,
        completionModel: config.completionModel,
        embeddingModel: config.embeddingModel,
      });
    case "anthropic":
      return createAnthropicProvider({
        apiKey: config.anthropicApiKey as string,
        completionModel: config.completionModel,
      });
  }
}

let cached: AIProvider | undefined;

// The single entry point for AI in feature code — the provider is picked by AI_PROVIDER,
// so switching between local Ollama and a hosted provider needs no code changes.
export function getAIProvider(): AIProvider {
  cached ??= createProvider(loadAIConfig());
  return cached;
}

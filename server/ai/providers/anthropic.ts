import { z } from "zod";
import { AIProviderError } from "../errors";
import { postJSON } from "../http";
import type { AIProvider, CompletionPrompt, CompletionResult } from "../types";

const BASE_URL = "https://api.anthropic.com/v1";
const API_VERSION = "2023-06-01";
// max_tokens is mandatory on the Messages API
const DEFAULT_MAX_TOKENS = 1024;

const messagesResponseSchema = z.object({
  model: z.string(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

export function createAnthropicProvider(options: {
  apiKey: string;
  completionModel: string;
}): AIProvider {
  const { apiKey, completionModel } = options;

  return {
    name: "anthropic",
    completionModel,
    embeddingModel: "",

    async complete(prompt: CompletionPrompt): Promise<CompletionResult> {
      // No native JSON mode — responseFormat "json" relies on the prompt's instructions,
      // and callers validate the output with Zod either way.
      const data = await postJSON(
        "anthropic",
        `${BASE_URL}/messages`,
        {
          model: completionModel,
          max_tokens: prompt.maxTokens ?? DEFAULT_MAX_TOKENS,
          messages: prompt.messages,
          ...(prompt.system && { system: prompt.system }),
          ...(prompt.temperature !== undefined && { temperature: prompt.temperature }),
        },
        messagesResponseSchema,
        { "x-api-key": apiKey, "anthropic-version": API_VERSION },
      );

      return {
        text: data.content
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join(""),
        model: data.model,
        usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens },
      };
    },

    async embed(): Promise<number[]> {
      throw new AIProviderError(
        "anthropic",
        "Anthropic does not offer an embeddings API — use AI_PROVIDER=openai or ollama for embeddings",
      );
    },
  };
}

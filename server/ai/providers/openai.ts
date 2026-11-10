import { z } from "zod";
import { AIProviderError } from "../errors";
import { postJSON } from "../http";
import type { AIProvider, AIProviderName, CompletionPrompt, CompletionResult } from "../types";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

const chatResponseSchema = z.object({
  model: z.string(),
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).optional(),
});

const embedResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })).min(1),
});

// Also backs OpenAI-compatible providers (e.g. Gemini) via `name`, `baseUrl`, and
// `extraBody` for provider-specific chat params.
export function createOpenAIProvider(options: {
  apiKey: string;
  completionModel: string;
  embeddingModel: string;
  name?: AIProviderName;
  baseUrl?: string;
  extraBody?: Record<string, unknown>;
}): AIProvider {
  const {
    apiKey,
    completionModel,
    embeddingModel,
    name = "openai",
    baseUrl = OPENAI_BASE_URL,
    extraBody,
  } = options;
  const headers = { authorization: `Bearer ${apiKey}` };

  return {
    name,
    completionModel,
    embeddingModel,

    async complete(prompt: CompletionPrompt): Promise<CompletionResult> {
      const messages = prompt.system
        ? [{ role: "system", content: prompt.system }, ...prompt.messages]
        : prompt.messages;

      const data = await postJSON(
        name,
        `${baseUrl}/chat/completions`,
        {
          model: completionModel,
          messages,
          ...(prompt.maxTokens !== undefined && { max_completion_tokens: prompt.maxTokens }),
          ...(prompt.temperature !== undefined && { temperature: prompt.temperature }),
          // JSON mode requires the word "JSON" to appear somewhere in the prompt.
          ...(prompt.responseFormat === "json" && { response_format: { type: "json_object" } }),
          ...extraBody,
        },
        chatResponseSchema,
        headers,
      );

      const content = data.choices[0]?.message.content;
      if (content == null) {
        throw new AIProviderError(name, "completion returned no content");
      }

      return {
        text: content,
        model: data.model,
        usage: data.usage && {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        },
      };
    },

    async embed(text: string): Promise<number[]> {
      const data = await postJSON(
        name,
        `${baseUrl}/embeddings`,
        { model: embeddingModel, input: text },
        embedResponseSchema,
        headers,
      );
      // .min(1) above guarantees the first entry exists
      return (data.data[0] as { embedding: number[] }).embedding;
    },
  };
}

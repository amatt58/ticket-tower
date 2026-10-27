import { z } from "zod";
import { postJSON } from "../http";
import type { AIProvider, CompletionPrompt, CompletionResult } from "../types";

const chatResponseSchema = z.object({
  model: z.string(),
  message: z.object({ content: z.string() }),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
});

const embedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())).min(1),
});

export function createOllamaProvider(options: {
  baseUrl: string;
  completionModel: string;
  embeddingModel: string;
}): AIProvider {
  const { baseUrl, completionModel, embeddingModel } = options;

  return {
    name: "ollama",
    completionModel,
    embeddingModel,

    async complete(prompt: CompletionPrompt): Promise<CompletionResult> {
      const messages = prompt.system
        ? [{ role: "system", content: prompt.system }, ...prompt.messages]
        : prompt.messages;

      const data = await postJSON(
        "ollama",
        `${baseUrl}/api/chat`,
        {
          model: completionModel,
          messages,
          stream: false,
          ...(prompt.responseFormat === "json" && { format: "json" }),
          options: {
            ...(prompt.temperature !== undefined && { temperature: prompt.temperature }),
            ...(prompt.maxTokens !== undefined && { num_predict: prompt.maxTokens }),
          },
        },
        chatResponseSchema,
      );

      return {
        text: data.message.content,
        model: data.model,
        usage:
          data.prompt_eval_count !== undefined && data.eval_count !== undefined
            ? { inputTokens: data.prompt_eval_count, outputTokens: data.eval_count }
            : undefined,
      };
    },

    async embed(text: string): Promise<number[]> {
      const data = await postJSON(
        "ollama",
        `${baseUrl}/api/embed`,
        { model: embeddingModel, input: text },
        embedResponseSchema,
      );
      // .min(1) above guarantees the first entry exists
      return data.embeddings[0] as number[];
    },
  };
}

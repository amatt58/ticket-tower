import { z } from "zod";
import { AI_PROVIDERS, type AIProviderName } from "./types";

const DEFAULT_MODELS: Record<AIProviderName, { completion: string; embedding: string }> = {
  ollama: { completion: "llama3.2", embedding: "nomic-embed-text" },
  openai: { completion: "gpt-4o-mini", embedding: "text-embedding-3-small" },
  // Anthropic has no embeddings API; the provider rejects embed() calls.
  anthropic: { completion: "claude-haiku-5-5", embedding: "" },
};

const envSchema = z
  .object({
    AI_PROVIDER: z.enum(AI_PROVIDERS).default("ollama"),
    AI_MODEL: z.string().trim().min(1).optional(),
    EMBEDDING_MODEL: z.string().trim().min(1).optional(),
    OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
    OPENAI_API_KEY: z.string().trim().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["OPENAI_API_KEY"], message: "required for openai" });
    }
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["ANTHROPIC_API_KEY"],
        message: "required for anthropic",
      });
    }
  });

export type AIConfig = {
  provider: AIProviderName;
  completionModel: string;
  embeddingModel: string;
  ollamaBaseUrl: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
};

export function loadAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid AI configuration:\n${z.prettifyError(parsed.error)}`);
  }

  const data = parsed.data;
  const defaults = DEFAULT_MODELS[data.AI_PROVIDER];
  return {
    provider: data.AI_PROVIDER,
    completionModel: data.AI_MODEL ?? defaults.completion,
    embeddingModel: data.EMBEDDING_MODEL ?? defaults.embedding,
    ollamaBaseUrl: data.OLLAMA_BASE_URL.replace(/\/+$/, ""),
    openaiApiKey: data.OPENAI_API_KEY,
    anthropicApiKey: data.ANTHROPIC_API_KEY,
  };
}

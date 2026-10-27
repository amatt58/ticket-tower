export const AI_PROVIDERS = ["ollama", "openai", "anthropic"] as const;
export type AIProviderName = (typeof AI_PROVIDERS)[number];

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CompletionPrompt = {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  // "json" asks the provider for a JSON-only response where it supports it natively
  // (Ollama, OpenAI). The prompt itself must still describe the expected shape.
  responseFormat?: "text" | "json";
};

export type CompletionResult = {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export interface AIProvider {
  readonly name: AIProviderName;
  readonly completionModel: string;
  // Persist this alongside every stored vector — embeddings are not comparable across models.
  readonly embeddingModel: string;
  complete(prompt: CompletionPrompt): Promise<CompletionResult>;
  embed(text: string): Promise<number[]>;
}

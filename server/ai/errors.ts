import type { AIProviderName } from "./types";

// The provider call itself failed (network, non-2xx, unexpected response shape).
export class AIProviderError extends Error {
  constructor(
    readonly provider: AIProviderName,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`[${provider}] ${message}`, options);
    this.name = "AIProviderError";
  }
}

// The provider responded, but the model output didn't match the expected schema.
export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly rawOutput: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIOutputError";
  }
}

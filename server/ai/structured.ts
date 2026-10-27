import { z } from "zod";
import { AIOutputError } from "./errors";
import type { AIProvider, CompletionPrompt } from "./types";

// Some models wrap JSON in a markdown fence even when told not to.
function stripCodeFence(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match?.[1] ?? text.trim();
}

// Runs a JSON-mode completion and validates the result against `schema`.
// AI output is never trusted until it passes this check.
export async function completeStructured<T>(
  provider: AIProvider,
  prompt: Omit<CompletionPrompt, "responseFormat">,
  schema: z.ZodType<T>,
): Promise<T> {
  const result = await provider.complete({ ...prompt, responseFormat: "json" });
  const raw = stripCodeFence(result.text);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new AIOutputError("model output was not valid JSON", result.text, { cause: error });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new AIOutputError(
      `model output failed validation:\n${z.prettifyError(parsed.error)}`,
      result.text,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

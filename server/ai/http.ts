import type { z } from "zod";
import { AIProviderError } from "./errors";
import type { AIProviderName } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;

// POSTs JSON to a provider endpoint and validates the response body against `schema`,
// so provider payloads are checked at runtime like any other external boundary.
export async function postJSON<T>(
  provider: AIProviderName,
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  headers: Record<string, string> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AIProviderError(provider, `request to ${url} failed`, { cause: error });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new AIProviderError(provider, `${response.status} ${response.statusText}: ${detail}`);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new AIProviderError(provider, "unexpected response shape", { cause: parsed.error });
  }
  return parsed.data;
}

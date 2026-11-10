import type { z } from "zod";
import { AIProviderError } from "./errors";
import type { AIProviderName } from "./types";

const REQUEST_TIMEOUT_MS = 60_000;

// Rate limits and overload spikes (common on free tiers) usually clear within seconds,
// so these statuses are retried with a short backoff before surfacing an error.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1_000, 3_000, 7_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  for (let attempt = 0; ; attempt++) {
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

    const delay = RETRY_DELAYS_MS[attempt];
    if (!RETRYABLE_STATUSES.has(response.status) || delay === undefined) break;
    console.warn(`[${provider}] ${response.status} from ${url}, retrying in ${delay}ms`);
    await response.body?.cancel();
    await sleep(delay);
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

import { z } from "zod";
import type { CompletionPrompt } from "../types";
import { formatTicketForPrompt, type TicketPromptContext } from "./ticket-context";

// Bump whenever the prompt or output schema changes, so stored summaries and audit
// events record which version produced them.
export const TICKET_SUMMARY_PROMPT_VERSION = "ticket-summary@1";

export const ticketSummaryOutputSchema = z.object({
  problem: z.string().trim().min(1),
  context: z.string().trim().min(1),
  currentStatus: z.string().trim().min(1),
  suggestedNextStep: z.string().trim().min(1),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated"]),
});

export type TicketSummaryOutput = z.infer<typeof ticketSummaryOutputSchema>;

const SYSTEM_PROMPT = `You are an assistant for a support team. You summarise support tickets so an agent can understand them at a glance.

Respond ONLY with a JSON object of exactly this shape:
{
  "problem": "one or two sentences: what the customer needs or what is broken",
  "context": "relevant background: environment, what was already tried, impact",
  "currentStatus": "where things stand now, based on the latest messages",
  "suggestedNextStep": "the single most useful next action for the agent",
  "sentiment": "positive" | "neutral" | "negative" | "frustrated"
}

Rules:
- Base everything on the ticket content. Do not invent details.
- "sentiment" describes the customer's tone, not the severity of the problem.
- Internal notes are visible to agents only; use them for context.
- Keep each field under 60 words.`;

export function buildTicketSummaryPrompt(
  ticket: TicketPromptContext,
): Omit<CompletionPrompt, "responseFormat"> {
  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: formatTicketForPrompt(ticket) }],
    temperature: 0.2,
    maxTokens: 800,
  };
}

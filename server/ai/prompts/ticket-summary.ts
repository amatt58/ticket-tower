import { z } from "zod";
import type { CompletionPrompt } from "../types";

// Bump whenever the prompt or output schema changes, so stored summaries and audit
// events record which version produced them.
export const TICKET_SUMMARY_PROMPT_VERSION = "ticket-summary@1";

const MAX_DESCRIPTION_CHARS = 4_000;
const MAX_MESSAGE_CHARS = 1_500;
const MAX_MESSAGES = 20;

export const ticketSummaryOutputSchema = z.object({
  problem: z.string().trim().min(1),
  context: z.string().trim().min(1),
  currentStatus: z.string().trim().min(1),
  suggestedNextStep: z.string().trim().min(1),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated"]),
});

export type TicketSummaryOutput = z.infer<typeof ticketSummaryOutputSchema>;

export type TicketSummaryContext = {
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  messages: {
    from: "customer" | "agent";
    isInternal: boolean;
    body: string;
  }[];
};

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

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

export function buildTicketSummaryPrompt(
  ticket: TicketSummaryContext,
): Omit<CompletionPrompt, "responseFormat"> {
  // Keep the most recent messages — they best reflect the current status.
  const messages = ticket.messages.slice(-MAX_MESSAGES);
  const thread =
    messages.length > 0
      ? messages
          .map((message) => {
            const label = message.isInternal ? "agent (internal note)" : message.from;
            return `[${label}]\n${truncate(message.body, MAX_MESSAGE_CHARS)}`;
          })
          .join("\n\n")
      : "(no messages yet)";

  const content = `Title: ${ticket.title}
Type: ${ticket.type}
Priority: ${ticket.priority}
Status: ${ticket.status}

Description:
${truncate(ticket.description, MAX_DESCRIPTION_CHARS)}

Conversation (oldest first):
${thread}`;

  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    temperature: 0.2,
    maxTokens: 800,
  };
}

import { z } from "zod";
import type { CompletionPrompt } from "../types";
import { formatTicketForPrompt, type TicketPromptContext } from "./ticket-context";

// Bump whenever the prompt changes, so audit events record which version produced a draft.
export const TICKET_REPLY_DRAFT_PROMPT_VERSION = "ticket-reply-draft@1";

export const ticketReplyDraftOutputSchema = z.string().trim().min(1).max(5_000);

const SYSTEM_PROMPT = `You are an assistant for a support team. You draft the agent's next reply to the customer on a support ticket.

Rules:
- Write ONLY the reply body, ready to send. No subject line, no preamble like "Here is a draft", no notes to the agent.
- Reply to the customer's most recent message, taking the whole thread into account.
- Be warm, clear, and concise. Match the customer's level of formality.
- Only state facts that appear in the ticket. Never invent product features, UI steps, dates, timelines, refunds, or fixes.
- If information is missing, ask the customer for it rather than guessing.
- Internal notes are visible to agents only. Use them for context, but never quote them or reveal internal details to the customer.
- Never use placeholders like [Customer] or [Name]. If the customer's name isn't in the ticket, open with "Hi there,".
- Always end with "Best regards," on its own line, followed by the agent's name on the next line.`;

export function buildTicketReplyDraftPrompt(
  ticket: TicketPromptContext,
  options: { agentName: string },
): CompletionPrompt {
  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${formatTicketForPrompt(ticket)}

Draft the next reply from agent ${options.agentName} to the customer.`,
      },
    ],
    temperature: 0.4,
    maxTokens: 800,
  };
}

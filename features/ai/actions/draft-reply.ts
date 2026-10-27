"use server";

import { ticketActionSchema } from "@/features/ai/schema";
import { toTicketPromptContext } from "@/features/ai/server/mappers";
import { getTicketForPrompt } from "@/features/ai/server/queries";
import { AIProviderError, type CompletionResult, getAIProvider } from "@/server/ai";
import {
  buildTicketReplyDraftPrompt,
  TICKET_REPLY_DRAFT_PROMPT_VERSION,
  ticketReplyDraftOutputSchema,
} from "@/server/ai/prompts/ticket-reply-draft";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export type DraftReplyResult = { draft: string; error?: never } | { draft?: never; error: string };

// Returns a suggested reply for the agent to edit. Nothing is sent or saved as a message —
// the agent submits it through the normal composer.
export async function draftReplyAction(input: { ticketId: string }): Promise<DraftReplyResult> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = ticketActionSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid ticket." };

  const ticket = await getTicketForPrompt(parsed.data.ticketId);
  if (!ticket) return { error: "Ticket not found." };

  const ai = getAIProvider();
  let result: CompletionResult;
  try {
    result = await ai.complete(
      buildTicketReplyDraftPrompt(toTicketPromptContext(ticket), {
        agentName: session.user.name ?? "the support team",
      }),
    );
  } catch (error) {
    console.error("Reply drafting failed", error);
    if (error instanceof AIProviderError) {
      return { error: "The AI service is unavailable. Please try again shortly." };
    }
    return { error: "Something went wrong generating the draft." };
  }

  const draft = ticketReplyDraftOutputSchema.safeParse(result.text);
  if (!draft.success) {
    console.error("Reply draft failed validation", draft.error, result.text);
    return { error: "The AI returned an unusable draft. Please try again." };
  }

  await db.ticketAuditEvent.create({
    data: {
      ticketId: ticket.id,
      // The agent who requested it, with actorType marking the content as AI-generated.
      actorId: session.user.id,
      actorType: "ai",
      eventType: "ai_draft_generated",
      metadata: {
        provider: ai.name,
        model: result.model,
        promptVersion: TICKET_REPLY_DRAFT_PROMPT_VERSION,
        ...(result.usage && { usage: result.usage }),
      },
    },
  });

  return { draft: draft.data };
}

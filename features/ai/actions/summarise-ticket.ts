"use server";

import { revalidatePath } from "next/cache";
import { type StoredTicketSummary, summariseTicketSchema } from "@/features/ai/schema";
import { toSummaryContext } from "@/features/ai/server/mappers";
import { getTicketForSummary } from "@/features/ai/server/queries";
import {
  AIOutputError,
  AIProviderError,
  completeStructured,
  getAIProvider,
  type StructuredResult,
} from "@/server/ai";
import {
  buildTicketSummaryPrompt,
  TICKET_SUMMARY_PROMPT_VERSION,
  type TicketSummaryOutput,
  ticketSummaryOutputSchema,
} from "@/server/ai/prompts/ticket-summary";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export type SummariseTicketResult = { error?: string };

export async function summariseTicketAction(input: {
  ticketId: string;
}): Promise<SummariseTicketResult> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const parsed = summariseTicketSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid ticket." };

  const ticket = await getTicketForSummary(parsed.data.ticketId);
  if (!ticket) return { error: "Ticket not found." };

  // The model call happens outside the transaction — it can take several seconds.
  const ai = getAIProvider();
  let result: StructuredResult<TicketSummaryOutput>;
  try {
    result = await completeStructured(
      ai,
      buildTicketSummaryPrompt(toSummaryContext(ticket)),
      ticketSummaryOutputSchema,
    );
  } catch (error) {
    console.error("Ticket summarisation failed", error);
    if (error instanceof AIProviderError) {
      return { error: "The AI service is unavailable. Please try again shortly." };
    }
    if (error instanceof AIOutputError) {
      return { error: "The AI returned an unusable summary. Please try again." };
    }
    return { error: "Something went wrong generating the summary." };
  }

  const { sentiment, ...summary } = result.data;
  const stored: StoredTicketSummary = {
    ...summary,
    generatedAt: new Date().toISOString(),
    model: result.model,
    promptVersion: TICKET_SUMMARY_PROMPT_VERSION,
  };

  await db.$transaction(async (tx) => {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { aiSummary: JSON.stringify(stored), aiSentiment: sentiment },
    });

    await tx.ticketAuditEvent.create({
      data: {
        ticketId: ticket.id,
        // The agent who requested it, with actorType marking the content as AI-generated.
        actorId: session.user.id,
        actorType: "ai",
        eventType: "ai_summary_generated",
        metadata: {
          provider: ai.name,
          model: result.model,
          promptVersion: TICKET_SUMMARY_PROMPT_VERSION,
          ...(result.usage && { usage: result.usage }),
        },
      },
    });
  });

  revalidatePath(`/tickets/${ticket.id}`);
  return {};
}

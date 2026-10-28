import type { TicketSentiment as PrismaTicketSentiment } from "@prisma/client";
import { storedTicketSummarySchema } from "@/features/ai/schema";
import type { getTicketForPrompt } from "@/features/ai/server/queries";
import type { TicketSummaryView } from "@/features/ai/types";
import type { TicketPromptContext } from "@/server/ai/prompts/ticket-context";

type TicketForPrompt = NonNullable<Awaited<ReturnType<typeof getTicketForPrompt>>>;

export function toTicketPromptContext(ticket: TicketForPrompt): TicketPromptContext {
  return {
    title: ticket.title,
    description: ticket.description,
    type: ticket.type,
    priority: ticket.priority,
    status: ticket.status,
    messages: ticket.messages.map((message) => ({
      from: message.authorId ? "agent" : "customer",
      isInternal: message.isInternal,
      body: message.body,
    })),
  };
}

export function toTicketSummaryView(ticket: {
  aiSummary: string | null;
  aiSentiment: PrismaTicketSentiment | null;
}): TicketSummaryView | null {
  if (!ticket.aiSummary) return null;

  let json: unknown;
  try {
    json = JSON.parse(ticket.aiSummary);
  } catch {
    return null;
  }

  const parsed = storedTicketSummarySchema.safeParse(json);
  if (!parsed.success) return null;

  const { generatedAt, promptVersion: _promptVersion, ...summary } = parsed.data;
  return { ...summary, sentiment: ticket.aiSentiment, generatedAt: new Date(generatedAt) };
}

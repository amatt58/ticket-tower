import { z } from "zod";

export const ticketActionSchema = z.object({
  ticketId: z.string().min(1),
});

// Shape persisted (as JSON) in Ticket.aiSummary. Parsed on read, so a malformed or
// legacy value degrades to "no summary" instead of breaking the page.
export const storedTicketSummarySchema = z.object({
  problem: z.string(),
  context: z.string(),
  currentStatus: z.string(),
  suggestedNextStep: z.string(),
  generatedAt: z.iso.datetime(),
  model: z.string(),
  promptVersion: z.string(),
});

export type StoredTicketSummary = z.infer<typeof storedTicketSummarySchema>;

import { db } from "@/server/db";

export async function getTicketForSummary(id: string) {
  return db.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      priority: true,
      status: true,
      messages: {
        // AI drafts and system messages are not part of the real conversation.
        where: { messageType: { in: ["customer_reply", "agent_note"] } },
        orderBy: { createdAt: "asc" },
        // Customers aren't app users, so customer messages have no author.
        select: { body: true, isInternal: true, authorId: true },
      },
    },
  });
}

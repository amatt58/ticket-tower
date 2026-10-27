// Shared formatting of a ticket for prompts, so every ticket prompt sees the same view
// of the ticket and the same truncation limits.

const MAX_DESCRIPTION_CHARS = 4_000;
const MAX_MESSAGE_CHARS = 1_500;
const MAX_MESSAGES = 20;

export type TicketPromptContext = {
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

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

export function formatTicketForPrompt(ticket: TicketPromptContext): string {
  // Keep the most recent messages — they best reflect the current state.
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

  return `Title: ${ticket.title}
Type: ${ticket.type}
Priority: ${ticket.priority}
Status: ${ticket.status}

Description:
${truncate(ticket.description, MAX_DESCRIPTION_CHARS)}

Conversation (oldest first):
${thread}`;
}

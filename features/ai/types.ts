export type TicketSentiment = "positive" | "neutral" | "negative" | "frustrated";

export type TicketSummaryView = {
  problem: string;
  context: string;
  currentStatus: string;
  suggestedNextStep: string;
  sentiment: TicketSentiment | null;
  generatedAt: Date;
  model: string;
};

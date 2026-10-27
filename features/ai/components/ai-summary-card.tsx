"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { summariseTicketAction } from "@/features/ai/actions/summarise-ticket";
import type { TicketSentiment, TicketSummaryView } from "@/features/ai/types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const SENTIMENT_VARIANT: Record<TicketSentiment, "default" | "secondary" | "destructive"> = {
  positive: "secondary",
  neutral: "secondary",
  negative: "default",
  frustrated: "destructive",
};

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// Mirrors the summary layout (sentiment badge + four labelled sections) so nothing
// shifts when the real content arrives.
function SummarySkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-32 rounded-full" />
      {["w-full", "w-11/12", "w-4/5", "w-full"].map((lastLineWidth, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className={`h-3 ${lastLineWidth}`} />
        </div>
      ))}
      <p role="status" className="text-xs text-muted-foreground">
        Reading the ticket and conversation...
      </p>
    </>
  );
}

export function AiSummaryCard({
  ticketId,
  summary,
}: {
  ticketId: string;
  summary: TicketSummaryView | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSummarise() {
    setError(null);
    startTransition(async () => {
      const result = await summariseTicketAction({ ticketId });
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI summary
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleSummarise} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />}
          {isPending ? "Summarising..." : summary ? "Regenerate" : "Summarise"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={isPending}>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isPending ? (
          <SummarySkeleton />
        ) : summary ? (
          <>
            {summary.sentiment && (
              <Badge variant={SENTIMENT_VARIANT[summary.sentiment]}>
                Customer: {summary.sentiment}
              </Badge>
            )}
            <Section label="Problem" text={summary.problem} />
            <Section label="Context" text={summary.context} />
            <Section label="Current status" text={summary.currentStatus} />
            <Section label="Suggested next step" text={summary.suggestedNextStep} />
            <p className="text-xs text-muted-foreground">
              Generated {dateTimeFormatter.format(summary.generatedAt)} by {summary.model}. Check
              against the thread before acting on it.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary yet. Generate one to get the problem, context, and a suggested next step at a
            glance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

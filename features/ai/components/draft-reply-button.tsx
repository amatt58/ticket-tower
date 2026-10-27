"use client";

import { Sparkles } from "lucide-react";
import { useTransition } from "react";
import { draftReplyAction } from "@/features/ai/actions/draft-reply";
import { Button } from "@/shared/components/ui/button";

export function DraftReplyButton({
  ticketId,
  onDraft,
  onError,
}: {
  ticketId: string;
  onDraft: (draft: string) => void;
  onError: (error: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await draftReplyAction({ ticketId });
          if (result.error) onError(result.error);
          else if (result.draft) onDraft(result.draft);
        });
      }}
    >
      <Sparkles className="h-4 w-4" />
      {isPending ? "Drafting..." : "Draft reply"}
    </Button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { draftReplyAction } from "@/features/ai/actions/draft-reply";

export function useReplyDraft(ticketId: string) {
  const [isDrafting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function requestDraft(onDraft: (draft: string) => void) {
    setError(null);
    startTransition(async () => {
      const result = await draftReplyAction({ ticketId });
      if (result.error) setError(result.error);
      else if (result.draft) onDraft(result.draft);
    });
  }

  return { isDrafting, error, requestDraft };
}

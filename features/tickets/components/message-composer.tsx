"use client";

import { useActionState, useRef, useState } from "react";
import { DraftReplyButton } from "@/features/ai/components/draft-reply-button";
import {
  type CreateMessageActionState,
  createMessageAction,
} from "@/features/tickets/actions/create-message";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

const initialState: CreateMessageActionState = {};

export function MessageComposer({ ticketId }: { ticketId: string }) {
  const [isInternal, setIsInternal] = useState(false);
  const [state, formAction, isPending] = useActionState(createMessageAction, initialState);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Uncontrolled so the form still resets itself after a successful submit.
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertDraft(draft: string) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    if (textarea.value.trim() && !window.confirm("Replace your current text with the AI draft?")) {
      return;
    }
    setDraftError(null);
    // A draft is always a customer reply, never an internal note.
    setIsInternal(false);
    textarea.value = draft;
    textarea.focus();
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="isInternal" value={String(isInternal)} />

      <Textarea
        ref={bodyRef}
        name="body"
        required
        rows={3}
        placeholder={isInternal ? "Add an internal note..." : "Reply to the customer..."}
      />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {draftError && <p className="text-sm text-destructive">{draftError}</p>}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="h-4 w-4"
          />
          Internal note (not visible to customer)
        </label>
        <div className="flex items-center gap-2">
          <DraftReplyButton ticketId={ticketId} onDraft={insertDraft} onError={setDraftError} />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Posting..." : isInternal ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}

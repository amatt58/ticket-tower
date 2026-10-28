"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { ReplyDraftSkeleton } from "@/features/ai/components/reply-draft-skeleton";
import { useReplyDraft } from "@/features/ai/hooks/use-reply-draft";
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
  const { isDrafting, error: draftError, requestDraft } = useReplyDraft(ticketId);
  // Uncontrolled so the form still resets itself after a successful submit.
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function handleDraft() {
    // Ask before the request, not after — drafts can take a while to arrive.
    if (
      bodyRef.current?.value.trim() &&
      !window.confirm("Replace your current text with an AI draft?")
    ) {
      return;
    }
    requestDraft((draft) => {
      const textarea = bodyRef.current;
      if (!textarea) return;
      // A draft is always a customer reply, never an internal note.
      setIsInternal(false);
      textarea.value = draft;
      textarea.focus();
    });
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="isInternal" value={String(isInternal)} />

      <div className="relative" aria-busy={isDrafting}>
        <Textarea
          ref={bodyRef}
          name="body"
          required
          rows={3}
          readOnly={isDrafting}
          placeholder={isInternal ? "Add an internal note..." : "Reply to the customer..."}
        />
        {isDrafting && <ReplyDraftSkeleton />}
      </div>

      {isDrafting && (
        <p role="status" className="text-sm text-muted-foreground">
          Drafting a reply from the conversation...
        </p>
      )}
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
          <Button type="button" variant="outline" onClick={handleDraft} disabled={isDrafting}>
            {isDrafting ? (
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isDrafting ? "Drafting..." : "Draft reply"}
          </Button>
          <Button type="submit" disabled={isPending || isDrafting}>
            {isPending ? "Posting..." : isInternal ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}

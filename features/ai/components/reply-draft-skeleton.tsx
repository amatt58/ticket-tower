import { Skeleton } from "@/shared/components/ui/skeleton";

// Covers the composer textarea while a draft is generated, so the placeholder sits
// exactly where the text will appear.
export function ReplyDraftSkeleton() {
  return (
    <div className="absolute inset-0 space-y-2 rounded-md border border-input bg-background px-3 py-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

import type * as React from "react";

import { cn } from "@/shared/lib/utils";

// Placeholder block with a shimmer sweep. The shimmer is skipped for users who prefer
// reduced motion; the grey block on its own still reads as "loading".
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-foreground/10",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/60 dark:before:via-white/15 before:to-transparent before:content-[''] motion-safe:before:animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

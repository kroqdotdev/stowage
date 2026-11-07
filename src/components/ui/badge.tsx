import * as React from "react";

import { cn } from "@/lib/utils";

/* A quiet tinted chip, the keyword family: for counts and short facts. */
function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md bg-chip px-2 text-[13px] font-medium whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

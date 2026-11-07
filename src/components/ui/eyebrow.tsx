import * as React from "react";

import { cn } from "@/lib/utils";

/* 13px tracked-caps mono label: NEXT SERVICE, LABEL, EMPTY LOCATIONS. */
export function Eyebrow({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-slot="eyebrow" className={cn("eyebrow", className)} {...props} />;
}

import { StatusText } from "@/components/ui/status-text";
import type { AssetStatus } from "@/components/assets/types";

/*
  Kept for the many call sites that import StatusBadge. The Workshop rule is
  status colour only on exceptions, so this is the status text, not a pill.
*/
export function StatusBadge({
  status,
  className,
  inTable,
}: {
  status: AssetStatus;
  className?: string;
  inTable?: boolean;
}) {
  return <StatusText status={status} className={className} inTable={inTable} />;
}

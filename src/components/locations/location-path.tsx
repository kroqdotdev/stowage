import { cn } from "@/lib/utils";

const SEP = " / ";

/*
  A location path: ancestors in ink-2, the leaf in ink. The leaf is never cut.
  In compact mode (phone cards) the path elides the middle when it is long
  ("Workshop / … / Shelf A"), then falls back to the leaf alone.
*/
export function LocationPath({
  path,
  compact = false,
  leafWeight = "medium",
  className,
}: {
  path: string | null | undefined;
  compact?: boolean;
  leafWeight?: "regular" | "medium";
  className?: string;
}) {
  if (!path) {
    return <span className={cn("text-muted-foreground", className)}>No location</span>;
  }
  const parts = path.split(SEP);
  const leaf = parts.pop() ?? path;
  let ancestors = parts.join(SEP);

  if (compact) {
    if (parts.length > 1 && path.length > 28) ancestors = `${parts[0]}${SEP}…`;
    if (ancestors && ancestors.length + leaf.length > 22) ancestors = "";
  }

  return (
    <span className={cn("inline-flex min-w-0 text-ink-2", className)}>
      {ancestors ? (
        <span className="min-w-0 truncate whitespace-pre">
          {ancestors}
          {SEP}
        </span>
      ) : null}
      <b
        className={cn(
          "shrink-0 text-foreground",
          leafWeight === "medium" ? "font-medium" : "font-normal",
        )}
      >
        {leaf}
      </b>
    </span>
  );
}

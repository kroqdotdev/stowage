import { cn } from "@/lib/utils";

/*
  Empty states sit on the concrete: a glyph aligned to the first line, a bold
  sentence that says what is true, a support line, and the next step under
  the copy.
*/
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-28 items-start gap-4 px-0.5 py-6 text-left",
        className,
      )}
    >
      {Icon ? (
        <div className="grid w-8 shrink-0 place-items-center pt-0.5 text-muted-foreground">
          <Icon className="size-6" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-2">{description}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

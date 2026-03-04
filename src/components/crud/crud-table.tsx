import { cn } from "@/lib/utils";

export function CrudTable({
  headers,
  children,
  emptyMessage,
  loading,
  colSpan,
  className,
}: {
  headers: Array<{ key: string; label: string; align?: "left" | "right" }>;
  children: React.ReactNode;
  emptyMessage: string;
  loading: boolean;
  colSpan: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border/60",
        className,
      )}
    >
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                className={cn(
                  "px-3 py-2 font-medium",
                  header.align === "right" && "text-right",
                )}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                Loading...
              </td>
            </tr>
          ) : children ? (
            children
          ) : (
            <tr>
              <td
                colSpan={colSpan}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

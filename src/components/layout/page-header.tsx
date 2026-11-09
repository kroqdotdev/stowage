import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

/*
  Page headers: the title with its count in mono, a subline, then the 2px ink
  rule, so every page's rule lands on the same line. A parent breadcrumb with
  an href becomes the 13px "← Parent" back link above the title.
*/
export function PageHeader({
  title,
  count,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  count?: number | string;
  description?: React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  const parent = breadcrumbs
    ? [...breadcrumbs]
        .reverse()
        .find((crumb) => crumb.href && crumb.href !== "/dashboard")
    : undefined;

  return (
    <div
      data-slot="page-header"
      className={cn(
        "mb-[22px] flex items-start gap-4 rule-ink pb-4 max-md:items-center",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {parent ? (
          <Link
            href={parent.href as string}
            className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-[3px]"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            {parent.label}
          </Link>
        ) : null}
        <h1 className="wide text-[28px] leading-[1.1] font-bold text-foreground max-md:text-2xl">
          {title}
          {count !== undefined ? (
            <span className="ml-3 align-[2px] font-mono text-[22px] font-medium tracking-normal text-muted-foreground">
              {count}
            </span>
          ) : null}
        </h1>
        {description != null ? (
          <p className="mt-1.5 text-sm text-ink-2 [&_a]:font-semibold [&_a]:whitespace-nowrap [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-[3px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2 pt-px max-md:hidden">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

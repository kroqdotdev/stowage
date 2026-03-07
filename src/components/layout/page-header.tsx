import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type PageHeaderBreadcrumb = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
}) {
  const resolvedBreadcrumbs =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs
      : [{ label: "Stowage", href: "/dashboard" }, { label: title }];

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          {resolvedBreadcrumbs.map((breadcrumb, index) => {
            const isLast = index === resolvedBreadcrumbs.length - 1;

            return (
              <Fragment key={`${breadcrumb.label}:${index}`}>
                <BreadcrumbItem>
                  {isLast || !breadcrumb.href ? (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">{title}</h1>
      {description != null ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

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
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {resolvedBreadcrumbs.map((breadcrumb, index) => {
            const isLast = index === resolvedBreadcrumbs.length - 1;

            return [
              <BreadcrumbItem key={`${breadcrumb.label}:${index}`}>
                {isLast || !breadcrumb.href ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
              !isLast ? (
                <BreadcrumbSeparator
                  key={`${breadcrumb.label}:${index}:separator`}
                />
              ) : null,
            ];
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

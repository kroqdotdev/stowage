import Link from "next/link"
import type { ReactNode } from "react"

type AuthPanelProps = {
  title: string
  description: string
  children: ReactNode
  footer?: {
    prompt: string
    href: string
    linkLabel: string
  }
}

export function AuthPanel({
  title,
  description,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border/70 bg-background/95 p-6 shadow-sm backdrop-blur">
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {children}

      {footer ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {footer.prompt}{" "}
          <Link
            href={footer.href}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {footer.linkLabel}
          </Link>
        </p>
      ) : null}
    </div>
  )
}

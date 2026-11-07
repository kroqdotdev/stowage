import Link from "next/link";
import type { ReactNode } from "react";

type AuthPanelProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: {
    prompt: string;
    href: string;
    linkLabel: string;
  };
};

/* The form block of the auth split screen: no card, it sits on the concrete. */
export function AuthPanel({
  title,
  description,
  eyebrow,
  children,
  footer,
}: AuthPanelProps) {
  return (
    <div className="w-full">
      <div className="mb-6">
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        <h1 className="wide text-[32px] leading-[1.05] font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-2">{description}</p>
      </div>

      {children}

      {footer ? (
        <p className="mt-5 text-sm text-ink-2">
          {footer.prompt}{" "}
          <Link
            href={footer.href}
            className="font-semibold text-foreground underline underline-offset-[3px]"
          >
            {footer.linkLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

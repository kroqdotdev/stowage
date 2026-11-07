"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { getLoginErrorMessage } from "@/components/auth/auth-error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUser,
} from "@/hooks/use-current-user";
import { checkFirstRun, login } from "@/lib/api/auth";

export function LoginForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: currentUser, isLoading } = useCurrentUser();
  const { data: bootstrap } = useQuery({
    queryKey: ["auth", "first-run"],
    queryFn: checkFirstRun,
    staleTime: 60_000,
  });
  const firstRun = bootstrap?.firstRun;
  const adminConfigReady = bootstrap?.adminConfigReady ?? true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace("/dashboard");
    }
  }, [currentUser, isLoading, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = await login({ email, password });
      qc.setQueryData(CURRENT_USER_QUERY_KEY, user);
      router.replace("/dashboard");
    } catch (caught) {
      setError(getLoginErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Sign in"
      description="Use the account your admin set up for you."
      footer={
        firstRun
          ? {
              prompt: "First time here?",
              href: "/setup",
              linkLabel: "Create the admin account",
            }
          : undefined
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-[13px] font-semibold text-foreground"
          >
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="login-password"
            className="block text-[13px] font-semibold text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="h-11 pr-16"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              required
            />
            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 cursor-pointer rounded-md px-2 font-mono text-[13px] font-medium tracking-[0.02em] text-ink-2 hover:text-foreground"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {error ? (
            <p
              id="login-error"
              role="alert"
              className="flex items-start gap-1.5 pt-1 text-sm font-medium text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          ) : null}
        </div>

        {!adminConfigReady ? (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-sm font-medium text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Server setup is incomplete. Set{" "}
              <code className="font-mono text-[13px]">
                POCKETBASE_SUPERUSER_EMAIL
              </code>{" "}
              and{" "}
              <code className="font-mono text-[13px]">
                POCKETBASE_SUPERUSER_PASSWORD
              </code>{" "}
              in your environment, then restart the app.
            </span>
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting || isLoading || !adminConfigReady}
        >
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthPanel>
  );
}

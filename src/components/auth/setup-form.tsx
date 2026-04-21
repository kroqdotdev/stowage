"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthPanel } from "@/components/auth/auth-panel";
import { getSetupErrorMessage } from "@/components/auth/auth-error-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENT_USER_QUERY_KEY } from "@/hooks/use-current-user";
import { checkFirstRun, createFirstAdmin } from "@/lib/api/auth";

export function SetupForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: bootstrap, isLoading } = useQuery({
    queryKey: ["auth", "first-run"],
    queryFn: checkFirstRun,
    staleTime: 60_000,
  });
  const firstRun = bootstrap?.firstRun;
  const adminConfigReady = bootstrap?.adminConfigReady ?? true;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firstRun === false) {
      router.replace("/login");
    }
  }, [firstRun, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const user = await createFirstAdmin({ email, name, password });
      qc.setQueryData(CURRENT_USER_QUERY_KEY, user);
      qc.setQueryData(["auth", "first-run"], {
        firstRun: false,
        adminConfigReady: true,
      });
      router.replace("/dashboard");
    } catch (caught) {
      setError(getSetupErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <AuthPanel
        title="Set up Stowage"
        description="Create the first administrator account to start using the app."
      >
        <div className="space-y-3">
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="h-9 animate-pulse rounded-md bg-muted" />
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Set up Stowage"
      description="Create the first administrator account. You can add more users later in Settings."
      footer={{
        prompt: "Setup already complete?",
        href: "/login",
        linkLabel: "Sign in",
      }}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {!adminConfigReady ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            Server setup is incomplete. Set
            {" `POCKETBASE_SUPERUSER_EMAIL` and `POCKETBASE_SUPERUSER_PASSWORD` "}
            in your Docker or Next environment, then restart the app.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="setup-name" className="text-sm font-medium">
            Full name
          </label>
          <Input
            id="setup-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Morgan"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="setup-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="setup-password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="setup-password-confirm"
            className="text-sm font-medium"
          >
            Confirm password
          </label>
          <Input
            id="setup-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            required
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={submitting || firstRun === false || !adminConfigReady}
        >
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Creating account..." : "Create admin account"}
        </Button>
      </form>
    </AuthPanel>
  );
}

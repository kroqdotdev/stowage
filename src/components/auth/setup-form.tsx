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
          <div className="h-11 animate-pulse rounded-md bg-border" />
          <div className="h-11 animate-pulse rounded-md bg-border" />
          <div className="h-11 animate-pulse rounded-md bg-border" />
          <div className="h-11 animate-pulse rounded-md bg-border" />
          <div className="h-11 animate-pulse rounded-md bg-border" />
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Set up Stowage"
      eyebrow="First run"
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
            className="text-sm font-medium text-destructive"
          >
            Server setup is incomplete. Set{" "}
            <code>POCKETBASE_SUPERUSER_EMAIL</code> and{" "}
            <code>POCKETBASE_SUPERUSER_PASSWORD</code> in your Docker or Next
            environment, then restart the app.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="setup-name" className="block text-[13px] font-semibold text-foreground">
            Full name
          </label>
          <Input
            id="setup-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Morgan"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="setup-email" className="block text-[13px] font-semibold text-foreground">
            Email
          </label>
          <Input
            id="setup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="setup-password" className="block text-[13px] font-semibold text-foreground">
            Password
          </label>
          <Input
            id="setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="setup-password-confirm"
            className="block text-[13px] font-semibold text-foreground"
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
            className="h-11"
            required
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting || firstRun === false || !adminConfigReady}
        >
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Creating account…" : "Create admin account"}
        </Button>
      </form>
    </AuthPanel>
  );
}

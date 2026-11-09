"use client";

import { useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { ApiRequestError } from "@/lib/api-client";
import { changePassword } from "@/lib/api/users";

function getPasswordChangeErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message || "Unable to change password. Try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to change password. Try again.";
}

export function PasswordChangeSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      changePassword(input),
    onSuccess: () => {
      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (caught) => {
      setError(getPasswordChangeErrorMessage(caught));
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    mutation.mutate({ currentPassword, newPassword });
  }

  return (
    <section aria-labelledby="settings-password-title">
      <SheetHeading
        title={<span id="settings-password-title">Change password</span>}
      />

      <form
        onSubmit={onSubmit}
        className="grid max-w-[560px] gap-4 px-0.5 pt-4 sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="current-password" className="text-sm font-semibold">
            Current password
          </label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm font-semibold">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-new-password"
            className="text-sm font-semibold"
          >
            Confirm new password
          </label>
          <Input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-1.5 text-sm font-medium text-destructive sm:col-span-2"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </p>
        ) : null}

        {success ? (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground sm:col-span-2"
          >
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {success}
          </p>
        ) : null}

        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {mutation.isPending ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}

"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useAction } from "convex/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/convex-api"

function getPasswordChangeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message.includes("Server Error")) {
      return "Unable to change password. Try again."
    }
    return error.message
  }

  return "Unable to change password. Try again."
}

export function PasswordChangeSection() {
  const changePassword = useAction(api.users.changePassword)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match")
      return
    }

    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setSuccess("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (caught) {
      setError(getPasswordChangeErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="settings-password-title"
      className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 id="settings-password-title" className="text-lg font-semibold tracking-tight">
          Change password
        </h2>
        <p className="text-sm text-muted-foreground">
          Update your password and keep this account secure.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="current-password" className="text-sm font-medium">
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
          <label htmlFor="new-password" className="text-sm font-medium">
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
          <label htmlFor="confirm-new-password" className="text-sm font-medium">
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
            className="sm:col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="sm:col-span-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" className="cursor-pointer" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  )
}

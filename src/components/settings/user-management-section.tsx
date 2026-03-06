"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Id } from "@/lib/convex-api";
import { getConvexUiMessage } from "@/lib/convex-errors";
import { formatDateFromTimestamp, type AppDateFormat } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

type CreateUserFormState = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
};

const INITIAL_CREATE_USER_FORM: CreateUserFormState = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

function formatCreatedDate(timestamp: number, format: AppDateFormat) {
  return formatDateFromTimestamp(timestamp, format);
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  return getConvexUiMessage(error, fallback);
}

function normalizeRoleUpdateErrorMessage(error: unknown) {
  const message = normalizeErrorMessage(error, "Unable to update user role");

  if (message.includes("At least one admin is required")) {
    return "You can't remove the last admin. Promote another user to admin first.";
  }

  return message;
}

export function UserManagementSection({
  currentUserId,
}: {
  currentUserId: Id<"users">;
}) {
  const dateFormat = useAppDateFormat();
  const users = useQuery(api.users.listUsers, {});
  const createUser = useAction(api.users.createUser);
  const updateUserRole = useMutation(api.users.updateUserRole);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(
    INITIAL_CREATE_USER_FORM,
  );
  const [creating, setCreating] = useState(false);

  const [roleEdits, setRoleEdits] = useState<Record<string, "admin" | "user">>(
    {},
  );
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);

  const rows = useMemo(() => users ?? [], [users]);
  const adminCount = useMemo(
    () => rows.filter((user) => user.role === "admin").length,
    [rows],
  );

  function openDialog() {
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (creating) {
      return;
    }
    setIsDialogOpen(false);
    setCreateForm(INITIAL_CREATE_USER_FORM);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createForm.password.length < 8) {
      toast.error("Temporary password must be at least 8 characters");
      return;
    }

    setCreating(true);
    try {
      await createUser({
        email: createForm.email,
        name: createForm.name,
        password: createForm.password,
        role: createForm.role,
      });
      toast.success("User created");
      setCreateForm(INITIAL_CREATE_USER_FORM);
      setIsDialogOpen(false);
    } catch (error) {
      const message = normalizeErrorMessage(error, "Unable to create user");
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveRole(
    userId: Id<"users">,
    currentRole: "admin" | "user",
  ) {
    const nextRole = roleEdits[userId] ?? currentRole;
    if (nextRole === currentRole) {
      return;
    }

    if (currentRole === "admin" && nextRole !== "admin" && adminCount <= 1) {
      const message =
        "You can't remove the last admin. Promote another user to admin first.";
      toast.error(message);
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }

    setSavingRoleUserId(userId);
    try {
      await updateUserRole({ userId, role: nextRole });
      toast.success("User role updated");
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (error) {
      const message = normalizeRoleUpdateErrorMessage(error);
      toast.error(message);
    } finally {
      setSavingRoleUserId(null);
    }
  }

  return (
    <section
      aria-labelledby="settings-user-management-title"
      className="rounded-xl border border-border/70 bg-background p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2
            id="settings-user-management-title"
            className="text-lg font-semibold tracking-tight"
          >
            User management
          </h2>
          <p className="text-sm text-muted-foreground">
            Add team members and manage access roles.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={openDialog}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === undefined ? null : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((user) => {
                const pendingRole = roleEdits[user._id] ?? user.role;
                const roleChanged = pendingRole !== user.role;
                const isSaving = savingRoleUserId === user._id;
                return (
                  <tr key={user._id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{user.name}</div>
                      {user._id === currentUserId ? (
                        <div className="text-xs text-muted-foreground">You</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={pendingRole}
                        onValueChange={(value) =>
                          setRoleEdits((prev) => ({
                            ...prev,
                            [user._id]: value as "admin" | "user",
                          }))
                        }
                        disabled={isSaving}
                      >
                        <SelectTrigger
                          className="h-8 w-28"
                          aria-label={`Role for ${user.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatCreatedDate(user.createdAt, dateFormat)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        disabled={!roleChanged || isSaving}
                        onClick={() => void handleSaveRole(user._id, user.role)}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CrudModal
        open={isDialogOpen}
        onClose={closeDialog}
        title="Add user"
        description="Create a new account with a temporary password."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={closeDialog}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              form="create-user-form"
              type="submit"
              className="cursor-pointer"
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {creating ? "Creating..." : "Create user"}
            </Button>
          </>
        }
      >
        <form
          id="create-user-form"
          onSubmit={handleCreateUser}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="new-user-name" className="text-sm font-medium">
              Full name
            </label>
            <Input
              id="new-user-name"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Taylor Smith"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-user-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="new-user-email"
              type="email"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              placeholder="taylor@example.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-user-password"
              className="text-sm font-medium"
            >
              Temporary password
            </label>
            <Input
              id="new-user-password"
              type="password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={createForm.role}
              onValueChange={(value) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: value as "admin" | "user",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </CrudModal>
    </section>
  );
}

export function __testOnly__formatCreatedDate(timestamp: number) {
  return formatCreatedDate(timestamp, "DD-MM-YYYY");
}

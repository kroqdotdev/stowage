"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ApiRequestError } from "@/lib/api-client";
import { createUser, listUsers, updateUserRole } from "@/lib/api/users";
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
  if (error instanceof ApiRequestError) {
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
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
  currentUserId: string;
}) {
  const dateFormat = useAppDateFormat();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("User created");
      setCreateForm(INITIAL_CREATE_USER_FORM);
      setIsDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(normalizeErrorMessage(error, "Unable to create user"));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "user";
    }) => updateUserRole(userId, role),
    onSuccess: () => {
      toast.success("User role updated");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(normalizeRoleUpdateErrorMessage(error));
    },
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserFormState>(
    INITIAL_CREATE_USER_FORM,
  );

  const [roleEdits, setRoleEdits] = useState<Record<string, "admin" | "user">>(
    {},
  );
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);

  const rows = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const adminCount = useMemo(
    () => rows.filter((user) => user.role === "admin").length,
    [rows],
  );

  function openDialog() {
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (createMutation.isPending) {
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

    createMutation.mutate({
      email: createForm.email,
      name: createForm.name,
      password: createForm.password,
      role: createForm.role,
    });
  }

  async function handleSaveRole(
    userId: string,
    currentRole: "admin" | "user",
  ) {
    const nextRole = roleEdits[userId] ?? currentRole;
    if (nextRole === currentRole) {
      return;
    }

    if (currentRole === "admin" && nextRole !== "admin" && adminCount <= 1) {
      toast.error(
        "You can't remove the last admin. Promote another user to admin first.",
      );
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }

    setSavingRoleUserId(userId);
    try {
      await updateRoleMutation.mutateAsync({ userId, role: nextRole });
      setRoleEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
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
            {usersQuery.isPending ? null : rows.length === 0 ? (
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
                const pendingRole = roleEdits[user.id] ?? user.role;
                const roleChanged = pendingRole !== user.role;
                const isSaving = savingRoleUserId === user.id;
                return (
                  <tr key={user.id} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{user.name}</div>
                      {user.id === currentUserId ? (
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
                            [user.id]: value as "admin" | "user",
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
                        onClick={() => void handleSaveRole(user.id, user.role)}
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
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              form="create-user-form"
              type="submit"
              className="cursor-pointer"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {createMutation.isPending ? "Creating..." : "Create user"}
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
            <label htmlFor="new-user-password" className="text-sm font-medium">
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

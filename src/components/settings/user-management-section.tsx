"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

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

  async function handleSaveRole(userId: string, currentRole: "admin" | "user") {
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

  const th =
    "h-10 border-b border-border px-3 text-left text-[13px] font-semibold whitespace-nowrap text-foreground";

  return (
    <section aria-labelledby="settings-user-management-title">
      <SheetHeading
        title={<span id="settings-user-management-title">Users</span>}
        count={usersQuery.isSuccess ? rows.length : undefined}
        aside={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openDialog}
          >
            <Plus />
            Add user…
          </Button>
        }
      />

      {usersQuery.isPending ? (
        <p className="py-4 text-sm text-muted-foreground md:hidden">
          Loading users...
        </p>
      ) : usersQuery.isError ? (
        <p
          role="alert"
          className="py-4 text-sm font-medium text-destructive md:hidden"
        >
          Could not load users. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-sm text-ink-2 md:hidden">No users found.</p>
      ) : (
        <ul className="md:hidden" data-testid="users-card-list">
          {rows.map((user) => {
            const pendingRole = roleEdits[user.id] ?? user.role;
            const roleChanged = pendingRole !== user.role;
            const isSaving = savingRoleUserId === user.id;
            return (
              <li
                key={user.id}
                data-testid={`user-card-${user.id}`}
                className="space-y-2.5 border-b border-border px-0.5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </span>
                    {user.id === currentUserId ? (
                      <span className="shrink-0 text-[13px] text-muted-foreground">
                        You
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-ink-2">{user.email}</p>
                  <p className="text-[13px] text-muted-foreground">
                    Created {formatCreatedDate(user.createdAt, dateFormat)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
                      className="h-10 flex-1"
                      aria-label={`Role for ${user.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    disabled={!roleChanged || isSaving}
                    onClick={() => void handleSaveRole(user.id, user.role)}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="hidden md:block">
        <table
          className="w-full border-collapse text-sm"
          data-testid="users-table"
        >
          <thead>
            <tr>
              <th className={cn(th, "pl-0.5")}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Role</th>
              <th className={cn(th, "hidden lg:table-cell")}>Created</th>
              <th className={cn(th, "pr-0.5 text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isPending ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr
                    key={`loading-${i}`}
                    className="border-b border-border"
                    aria-hidden={i > 0 ? true : undefined}
                  >
                    <td colSpan={5} className="py-3.5 pl-0.5">
                      {i === 0 ? (
                        <span className="sr-only">Loading users...</span>
                      ) : null}
                      <Skeleton className="h-2.5 w-1/2" />
                    </td>
                  </tr>
                ))}
              </>
            ) : usersQuery.isError ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-0.5 py-6 font-medium text-destructive"
                >
                  Could not load users. Please try again.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-0.5 py-6 text-ink-2">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((user) => {
                const pendingRole = roleEdits[user.id] ?? user.role;
                const roleChanged = pendingRole !== user.role;
                const isSaving = savingRoleUserId === user.id;
                return (
                  <tr key={user.id} className="border-b border-border">
                    <td className="py-2.5 pr-3 pl-0.5">
                      <span className="font-medium text-foreground">
                        {user.name}
                      </span>
                      {user.id === currentUserId ? (
                        <span className="ml-2 text-[13px] text-muted-foreground">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{user.email}</td>
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
                          size="sm"
                          className="w-28"
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
                    <td className="hidden px-3 py-2.5 whitespace-nowrap text-ink-2 lg:table-cell">
                      {formatCreatedDate(user.createdAt, dateFormat)}
                    </td>
                    <td className="py-2 pr-0.5 pl-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!roleChanged || isSaving}
                        onClick={() => void handleSaveRole(user.id, user.role)}
                      >
                        {isSaving ? <Loader2 className="animate-spin" /> : null}
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
              onClick={closeDialog}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              form="create-user-form"
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="animate-spin" />
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
            <label htmlFor="new-user-name" className="text-sm font-semibold">
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
            <label htmlFor="new-user-email" className="text-sm font-semibold">
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
              className="text-sm font-semibold"
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
            <label id="new-user-role-label" className="text-sm font-semibold">
              Role
            </label>
            <Select
              value={createForm.role}
              onValueChange={(value) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: value as "admin" | "user",
                }))
              }
            >
              <SelectTrigger
                className="w-full"
                aria-labelledby="new-user-role-label"
              >
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

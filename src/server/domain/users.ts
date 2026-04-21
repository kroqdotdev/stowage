import { ClientResponseError } from "pocketbase";
import PocketBase from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  requireValidEmail,
  requireValidName,
  requireValidPassword,
  USER_ROLES,
  type UserRole,
} from "@/server/pb/users";

const roleSchema = z.enum(USER_ROLES);

export const CreateFirstAdminInput = z.object({
  email: z.string(),
  name: z.string(),
  password: z.string(),
});

export const CreateUserInput = z.object({
  email: z.string(),
  name: z.string(),
  password: z.string(),
  role: roleSchema,
  actorId: z.string(),
});

export const UpdateUserRoleInput = z.object({
  userId: z.string(),
  role: roleSchema,
  actorId: z.string(),
});

export const ChangePasswordInput = z.object({
  userId: z.string(),
  currentPassword: z.string(),
  newPassword: z.string(),
});

export type CreateFirstAdminInput = z.infer<typeof CreateFirstAdminInput>;
export type CreateUserInput = z.infer<typeof CreateUserInput>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInput>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdBy: string | null;
  createdAt: number;
};

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdBy?: string;
  createdAt: number;
};

function toSummary(record: UserRecord): UserSummary {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    createdBy: record.createdBy ? record.createdBy : null,
    createdAt: record.createdAt,
  };
}

export async function checkFirstRun(ctx: Ctx): Promise<boolean> {
  const records = await ctx.pb.collection("users").getList<UserRecord>(1, 1, {
    fields: "id",
    filter: 'role = "admin"',
  });
  return records.totalItems === 0;
}

export async function listUsers(ctx: Ctx): Promise<UserSummary[]> {
  const records = await ctx.pb.collection("users").getFullList<UserRecord>();
  return records.sort((a, b) => b.createdAt - a.createdAt).map(toSummary);
}

export async function getUserById(
  ctx: Ctx,
  userId: string,
): Promise<UserSummary | null> {
  try {
    const record = await ctx.pb.collection("users").getOne<UserRecord>(userId);
    return toSummary(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getUserByEmail(
  ctx: Ctx,
  email: string,
): Promise<UserSummary | null> {
  const normalized = requireValidEmail(email);
  try {
    const record = await ctx.pb
      .collection("users")
      .getFirstListItem<UserRecord>(`email = "${normalized}"`);
    return toSummary(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function insertUser(
  ctx: Ctx,
  {
    email,
    name,
    password,
    role,
    createdBy,
  }: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    createdBy: string | null;
  },
): Promise<UserSummary> {
  try {
    const record = await ctx.pb.collection("users").create<UserRecord>({
      email,
      password,
      passwordConfirm: password,
      name,
      role,
      createdAt: Date.now(),
      ...(createdBy ? { createdBy } : {}),
      emailVisibility: true,
    });
    return toSummary(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 400) {
      const payload = JSON.stringify(error.data ?? {});
      if (payload.includes("email")) {
        throw new ConflictError("A user with this email already exists");
      }
      throw new ValidationError(error.message || "Failed to create user");
    }
    throw error;
  }
}

export async function createFirstAdmin(
  ctx: Ctx,
  input: CreateFirstAdminInput,
): Promise<UserSummary> {
  const parsed = CreateFirstAdminInput.parse(input);

  if (!(await checkFirstRun(ctx))) {
    throw new ConflictError("First admin has already been created");
  }

  const email = requireValidEmail(parsed.email);
  const name = requireValidName(parsed.name);
  const password = requireValidPassword(parsed.password);

  return insertUser(ctx, {
    email,
    name,
    password,
    role: "admin",
    createdBy: null,
  });
}

export async function createUser(
  ctx: Ctx,
  input: CreateUserInput,
): Promise<UserSummary> {
  const parsed = CreateUserInput.parse(input);

  const email = requireValidEmail(parsed.email);
  const name = requireValidName(parsed.name);
  const password = requireValidPassword(parsed.password);

  return insertUser(ctx, {
    email,
    name,
    password,
    role: parsed.role,
    createdBy: parsed.actorId,
  });
}

export async function updateUserRole(
  ctx: Ctx,
  input: UpdateUserRoleInput,
): Promise<UserSummary> {
  const parsed = UpdateUserRoleInput.parse(input);

  const target = await getUserById(ctx, parsed.userId);
  if (!target) {
    throw new NotFoundError("User not found");
  }

  if (target.role === "admin" && parsed.role !== "admin") {
    const admins = await ctx.pb
      .collection("users")
      .getList<UserRecord>(1, 2, { filter: 'role = "admin"' });
    if (admins.totalItems <= 1) {
      throw new ValidationError("At least one admin is required");
    }
  }

  const updated = await ctx.pb
    .collection("users")
    .update<UserRecord>(parsed.userId, { role: parsed.role });
  return toSummary(updated);
}

export async function changePassword(
  ctx: Ctx,
  input: ChangePasswordInput,
): Promise<void> {
  const parsed = ChangePasswordInput.parse(input);
  const newPassword = requireValidPassword(parsed.newPassword);

  const user = await getUserById(ctx, parsed.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Verify the current password by attempting an auth with a scratch client.
  // We deliberately do NOT use ctx.pb so the admin auth token stays intact.
  const verifier = new PocketBase(ctx.pb.baseURL);
  verifier.autoCancellation(false);
  try {
    await verifier
      .collection("users")
      .authWithPassword(user.email, parsed.currentPassword);
  } catch (error) {
    if (error instanceof ClientResponseError) {
      throw new ValidationError("Current password is incorrect");
    }
    throw error;
  }

  await ctx.pb.collection("users").update(parsed.userId, {
    password: newPassword,
    passwordConfirm: newPassword,
  });
}

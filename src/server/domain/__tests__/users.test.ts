import PocketBase from "pocketbase";
import { describe, expect, it } from "vitest";

import {
  changePassword,
  checkFirstRun,
  createFirstAdmin,
  createUser,
  getUserByEmail,
  getUserById,
  listUsers,
  updateUserRole,
} from "@/server/domain/users";
import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import { usePbHarness } from "@/test/pb-harness";

describe("users domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("checkFirstRun returns true when no users exist", async () => {
    await expect(checkFirstRun(ctx())).resolves.toBe(true);
  });

  it("checkFirstRun stays true until an admin exists", async () => {
    await ctx().pb.collection("users").create({
      email: "member@stowage.local",
      password: "password123",
      passwordConfirm: "password123",
      name: "Member",
      role: "user",
      createdAt: Date.now(),
    });

    await expect(checkFirstRun(ctx())).resolves.toBe(true);
  });

  it("createFirstAdmin seeds the bootstrap admin and locks the endpoint", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "Admin@Stowage.Local",
      name: "  Root User  ",
      password: "password123",
    });
    expect(admin).toMatchObject({
      email: "admin@stowage.local",
      name: "Root User",
      role: "admin",
      createdBy: null,
    });
    expect(admin.id).toMatch(/^\w{15}$/);

    await expect(checkFirstRun(ctx())).resolves.toBe(false);
    await expect(
      createFirstAdmin(ctx(), {
        email: "second@stowage.local",
        name: "Second Admin",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("createFirstAdmin still works when only non-admin users exist", async () => {
    await ctx().pb.collection("users").create({
      email: "member@stowage.local",
      password: "password123",
      passwordConfirm: "password123",
      name: "Member",
      role: "user",
      createdAt: Date.now(),
    });

    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });

    expect(admin.role).toBe("admin");
    await expect(checkFirstRun(ctx())).resolves.toBe(false);
  });

  it("createFirstAdmin validates email, name, and password", async () => {
    await expect(
      createFirstAdmin(ctx(), {
        email: "not-an-email",
        name: "A",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createFirstAdmin(ctx(), {
        email: "ok@stowage.local",
        name: "   ",
        password: "password123",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createFirstAdmin(ctx(), {
        email: "ok@stowage.local",
        name: "Admin",
        password: "short",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createUser creates a user and records the actor as createdBy", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    const member = await createUser(ctx(), {
      email: "member@stowage.local",
      name: "Team Member",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });
    expect(member).toMatchObject({
      email: "member@stowage.local",
      name: "Team Member",
      role: "user",
      createdBy: admin.id,
    });
  });

  it("createUser rejects duplicate emails with ConflictError", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await createUser(ctx(), {
      email: "dup@stowage.local",
      name: "One",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });
    await expect(
      createUser(ctx(), {
        email: "dup@stowage.local",
        name: "Two",
        password: "password123",
        role: "user",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("listUsers returns users in reverse-chronological order", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createUser(ctx(), {
      email: "b@stowage.local",
      name: "B",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });
    await new Promise((r) => setTimeout(r, 5));
    const c = await createUser(ctx(), {
      email: "c@stowage.local",
      name: "C",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });

    const list = await listUsers(ctx());
    expect(list.map((u) => u.id)).toEqual([c.id, b.id, admin.id]);
  });

  it("getUserById and getUserByEmail resolve existing users and return null otherwise", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await expect(getUserById(ctx(), admin.id)).resolves.toMatchObject({
      email: "admin@stowage.local",
    });
    await expect(
      getUserByEmail(ctx(), "ADMIN@STOWAGE.LOCAL"),
    ).resolves.toMatchObject({ id: admin.id });
    await expect(getUserById(ctx(), "nonexistent0000")).resolves.toBeNull();
    await expect(
      getUserByEmail(ctx(), "missing@stowage.local"),
    ).resolves.toBeNull();
  });

  it("updateUserRole promotes and demotes users", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    const member = await createUser(ctx(), {
      email: "member@stowage.local",
      name: "Member",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });
    const promoted = await updateUserRole(ctx(), {
      userId: member.id,
      role: "admin",
      actorId: admin.id,
    });
    expect(promoted.role).toBe("admin");

    const demoted = await updateUserRole(ctx(), {
      userId: member.id,
      role: "user",
      actorId: admin.id,
    });
    expect(demoted.role).toBe("user");
  });

  it("updateUserRole refuses to demote the last admin", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await createUser(ctx(), {
      email: "member@stowage.local",
      name: "Member",
      password: "password123",
      role: "user",
      actorId: admin.id,
    });
    await expect(
      updateUserRole(ctx(), {
        userId: admin.id,
        role: "user",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updateUserRole throws NotFoundError when the user is missing", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await expect(
      updateUserRole(ctx(), {
        userId: "nonexistent0000",
        role: "admin",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("changePassword verifies current password and updates the credential", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await changePassword(ctx(), {
      userId: admin.id,
      currentPassword: "password123",
      newPassword: "newpassword456",
    });

    const url = getHarness().url;
    const client = new PocketBase(url);
    client.autoCancellation(false);
    await expect(
      client
        .collection("users")
        .authWithPassword("admin@stowage.local", "password123"),
    ).rejects.toThrow();
    await expect(
      client
        .collection("users")
        .authWithPassword("admin@stowage.local", "newpassword456"),
    ).resolves.toBeTruthy();
  });

  it("changePassword rejects an incorrect current password", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await expect(
      changePassword(ctx(), {
        userId: admin.id,
        currentPassword: "wrong-password",
        newPassword: "newpassword456",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("changePassword rejects a too-short new password", async () => {
    const admin = await createFirstAdmin(ctx(), {
      email: "admin@stowage.local",
      name: "Admin",
      password: "password123",
    });
    await expect(
      changePassword(ctx(), {
        userId: admin.id,
        currentPassword: "password123",
        newPassword: "short",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

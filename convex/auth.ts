import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, retrieveAccount } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import {
  INVALID_CREDENTIALS,
  isFirstAdminBootstrapAttempt,
  normalizePasswordSignInError,
} from "./auth_helpers";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Email is required");
  }

  const email = value.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required");
  }

  return email;
}

function requirePassword(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Password is required");
  }

  return value;
}

const passwordProvider = ConvexCredentials({
  id: "password",
  authorize: async (params, ctx) => {
    const flow = params.flow;
    if (flow !== "signIn") {
      if (flow === "signUp") {
        throw new Error("Direct sign up is disabled");
      }
      throw new Error("Unsupported password authentication flow");
    }

    const email = normalizeEmail(params.email);
    const password = requirePassword(params.password);

    try {
      const retrieved = await retrieveAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
      });

      if (!retrieved) {
        return null;
      }

      return { userId: retrieved.user._id };
    } catch (error) {
      const normalizedError = normalizePasswordSignInError(error);
      if (normalizedError === INVALID_CREDENTIALS) {
        return null;
      }
      throw normalizedError;
    }
  },
  crypto: {
    async hashSecret(password: string) {
      return await new Scrypt().hash(password);
    },
    async verifySecret(password: string, hash: string) {
      return await new Scrypt().verify(hash, password);
    },
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, args) => {
      if (!isFirstAdminBootstrapAttempt(args)) {
        return;
      }

      const users = await ctx.db.query("users").take(2);
      if (users.length !== 1) {
        throw new ConvexError("Setup is already complete");
      }
    },
  },
});

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireProvisionSecret(request: Request) {
  const secret = process.env.PROVISION_SECRET;
  if (!secret) {
    return {
      error: jsonResponse({ error: "Provisioning is not configured" }, 503),
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  return { error: null };
}

const provisionAdmin = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const provisionAuth = requireProvisionSecret(request);
  if (provisionAuth.error) {
    return provisionAuth.error;
  }

  let body: { email?: string; name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { email, name, password } = body;
  if (!email || !name || !password) {
    return jsonResponse(
      { error: "Missing required fields: email, name, password" },
      400,
    );
  }

  const isFirstRun = await ctx.runQuery(api.users.checkFirstRun);

  if (!isFirstRun) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await ctx.runQuery(
      internal.users.getUserByEmailInternal,
      { email: normalizedEmail },
    );

    if (existingUser && existingUser.role === "admin") {
      return jsonResponse(
        { status: "already_provisioned", userId: existingUser._id },
        200,
      );
    }

    return jsonResponse(
      { error: "Instance already provisioned with a different admin" },
      409,
    );
  }

  try {
    const result = await ctx.runAction(api.users.createFirstAdmin, {
      email,
      name,
      password,
    });
    return jsonResponse({ status: "provisioned", userId: result.userId }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Provisioning failed";
    return jsonResponse({ error: message }, 500);
  }
});

http.route({
  path: "/api/provision",
  method: "POST",
  handler: provisionAdmin,
});

const getStorageUsage = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const provisionAuth = requireProvisionSecret(request);
  if (provisionAuth.error) {
    return provisionAuth.error;
  }

  const usage = await ctx.runQuery(
    internal.storage_quota.getStorageUsageInternal,
  );
  return jsonResponse(usage, 200);
});

http.route({
  path: "/api/storage",
  method: "GET",
  handler: getStorageUsage,
});

export default http;

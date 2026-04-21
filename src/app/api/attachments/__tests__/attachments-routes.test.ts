import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { makeRequest, readJson, seedUser } from "@/app/api/__tests__/helpers";
import { createAsset } from "@/server/domain/assets";
import { createAttachment } from "@/server/domain/attachments";
import { usePbHarness } from "@/test/pb-harness";

describe("attachments routes", () => {
  const getHarness = usePbHarness();

  beforeEach(() => {
    const h = getHarness();
    vi.stubEnv("POCKETBASE_URL", h.url);
    vi.stubEnv("POCKETBASE_SUPERUSER_EMAIL", "test@stowage.local");
    vi.stubEnv("POCKETBASE_SUPERUSER_PASSWORD", "test-password-12345");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function createAssetDirect(actorId: string) {
    const harness = getHarness();
    const { assetId } = await createAsset(
      { pb: harness.admin },
      { name: "Upload target", actorId },
    );
    return assetId;
  }

  describe("POST /api/attachments", () => {
    it("rejects unauthenticated callers with 401", async () => {
      const { POST } = await import("@/app/api/attachments/route");
      const form = new FormData();
      form.append("assetId", "x");
      form.append("file", new Blob(["x"]), "x.txt");
      const req = new NextRequest("http://localhost/api/attachments", {
        method: "POST",
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("rejects JSON bodies with 400", async () => {
      const user = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/attachments/route");
      const res = await POST(
        makeRequest("http://localhost/api/attachments", {
          method: "POST",
          token: user.token,
          json: { hello: "world" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await readJson<{ error: string }>(res);
      expect(body.error).toMatch(/multipart/i);
    });

    it("rejects empty multipart (missing assetId) with 400", async () => {
      const user = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/attachments/route");
      const form = new FormData();
      form.append("file", new Blob(["hi"]), "hi.txt");
      const req = new NextRequest("http://localhost/api/attachments", {
        method: "POST",
        headers: { cookie: `pb_auth=${user.token}` },
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("uploads a PDF and returns 201 with the attachmentId", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const assetId = await createAssetDirect(admin.id);

      const { POST } = await import("@/app/api/attachments/route");
      const form = new FormData();
      form.append("assetId", assetId);
      form.append(
        "file",
        new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], {
          type: "application/pdf",
        }),
        "note.pdf",
      );
      const req = new NextRequest("http://localhost/api/attachments", {
        method: "POST",
        headers: { cookie: `pb_auth=${admin.token}` },
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await readJson<{ attachmentId: string }>(res);
      expect(body.attachmentId).toMatch(/^[a-z0-9]+$/);
    });

    it("rejects unsupported file types with 400", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const assetId = await createAssetDirect(admin.id);

      const { POST } = await import("@/app/api/attachments/route");
      const form = new FormData();
      form.append("assetId", assetId);
      form.append("file", new Blob(["text"]), "note.txt");
      const req = new NextRequest("http://localhost/api/attachments", {
        method: "POST",
        headers: { cookie: `pb_auth=${admin.token}` },
        body: form,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/attachments", () => {
    it("returns 400 when assetId is missing", async () => {
      const user = await seedUser(getHarness(), "user");
      const { GET } = await import("@/app/api/attachments/route");
      const res = await GET(
        makeRequest("http://localhost/api/attachments", { token: user.token }),
      );
      expect(res.status).toBe(400);
    });

    it("returns attachments for the given asset", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const assetId = await createAssetDirect(admin.id);

      const { GET } = await import("@/app/api/attachments/route");
      const res = await GET(
        makeRequest(`http://localhost/api/attachments?assetId=${assetId}`, {
          token: admin.token,
        }),
      );
      expect(res.status).toBe(200);
      const body = await readJson<{ attachments: unknown[] }>(res);
      expect(Array.isArray(body.attachments)).toBe(true);
    });
  });

  describe("GET /api/attachments/[id]/download", () => {
    it("proxies file bytes through the app for authenticated users", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const assetId = await createAssetDirect(admin.id);
      const { attachmentId } = await createAttachment(
        { pb: getHarness().admin },
        {
          assetId,
          fileName: "note.pdf",
          fileType: "application/pdf",
          fileBuffer: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
          actorId: admin.id,
        },
      );

      const { GET } = await import("@/app/api/attachments/[id]/download/route");
      const res = await GET(
        makeRequest(
          `http://localhost/api/attachments/${attachmentId}/download`,
          { token: admin.token },
        ),
        { params: Promise.resolve({ id: attachmentId }) },
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");
      expect((await res.arrayBuffer()).byteLength).toBe(5);
    });
  });
});

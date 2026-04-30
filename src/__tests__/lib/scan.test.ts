import { describe, it, expect, vi } from "vitest";

import type { AssetDetail } from "@/lib/api/assets";
import { extractStowageAssetId, resolveScanTarget } from "@/lib/scan";

const APP_ORIGIN = "https://stowage.example.com";

function makeAsset(id: string, assetTag: string): AssetDetail {
  return {
    id,
    name: `Test ${id}`,
    assetTag,
    status: "active",
    categoryId: null,
    locationId: null,
    serviceGroupId: null,
    notes: null,
    customFieldValues: {},
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: 0,
    updatedAt: 0,
  } as AssetDetail;
}

describe("extractStowageAssetId", () => {
  it("returns the id when the URL matches the app origin and /assets/<id>", () => {
    expect(
      extractStowageAssetId(
        "https://stowage.example.com/assets/abc123",
        APP_ORIGIN,
      ),
    ).toBe("abc123");
  });

  it("tolerates a trailing slash on the app origin", () => {
    expect(
      extractStowageAssetId(
        "https://stowage.example.com/assets/abc123",
        "https://stowage.example.com/",
      ),
    ).toBe("abc123");
  });

  it("trims whitespace from the scanned text", () => {
    expect(
      extractStowageAssetId(
        "   https://stowage.example.com/assets/abc123   ",
        APP_ORIGIN,
      ),
    ).toBe("abc123");
  });

  it("returns null for a URL on a different origin", () => {
    expect(
      extractStowageAssetId(
        "https://evil.example.com/assets/abc123",
        APP_ORIGIN,
      ),
    ).toBeNull();
  });

  it("returns null for a URL with matching origin but the wrong path", () => {
    expect(
      extractStowageAssetId(
        "https://stowage.example.com/foo/abc123",
        APP_ORIGIN,
      ),
    ).toBeNull();
    expect(
      extractStowageAssetId("https://stowage.example.com/assets", APP_ORIGIN),
    ).toBeNull();
  });

  it("extracts ids from deep links and base-path prefixed asset URLs", () => {
    expect(
      extractStowageAssetId(
        "https://stowage.example.com/assets/abc123/edit",
        APP_ORIGIN,
      ),
    ).toBe("abc123");
    expect(
      extractStowageAssetId(
        "https://stowage.example.com/stowage/assets/abc123/service",
        APP_ORIGIN,
      ),
    ).toBe("abc123");
  });

  it("returns null for a non-URL input", () => {
    expect(extractStowageAssetId("AST-0047", APP_ORIGIN)).toBeNull();
    expect(extractStowageAssetId("", APP_ORIGIN)).toBeNull();
    expect(extractStowageAssetId("   ", APP_ORIGIN)).toBeNull();
    expect(extractStowageAssetId("hello world", APP_ORIGIN)).toBeNull();
  });

  it("rejects URLs with a port mismatch", () => {
    expect(
      extractStowageAssetId(
        "https://stowage.example.com:8443/assets/abc123",
        APP_ORIGIN,
      ),
    ).toBeNull();
  });
});

describe("resolveScanTarget", () => {
  it("resolves a matching URL via fetchById", async () => {
    const asset = makeAsset("abc123", "AST-0047");
    const fetchById = vi.fn().mockResolvedValue(asset);
    const fetchByTag = vi.fn();

    const result = await resolveScanTarget(
      "https://stowage.example.com/assets/abc123",
      APP_ORIGIN,
      { fetchById, fetchByTag },
    );

    expect(result).toEqual({ status: "asset", asset });
    expect(fetchById).toHaveBeenCalledWith("abc123");
    expect(fetchByTag).not.toHaveBeenCalled();
  });

  it("returns unresolved when fetchById returns null (404)", async () => {
    const fetchById = vi.fn().mockResolvedValue(null);
    const fetchByTag = vi.fn();

    const result = await resolveScanTarget(
      "https://stowage.example.com/assets/missing",
      APP_ORIGIN,
      { fetchById, fetchByTag },
    );

    expect(result.status).toBe("unresolved");
    expect(fetchByTag).not.toHaveBeenCalled();
  });

  it("returns unresolved when fetchById throws (network / 403)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchById = vi.fn().mockRejectedValue(new Error("forbidden"));
    const fetchByTag = vi.fn();

    const result = await resolveScanTarget(
      "https://stowage.example.com/assets/nope",
      APP_ORIGIN,
      { fetchById, fetchByTag },
    );

    expect(result).toEqual({
      status: "unresolved",
      rawText: "https://stowage.example.com/assets/nope",
    });
    expect(fetchByTag).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "safeLookup failed while resolving a scanned asset",
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("falls back to fetchByTag for bare asset tags", async () => {
    const asset = makeAsset("abc", "AST-0047");
    const fetchById = vi.fn();
    const fetchByTag = vi.fn().mockResolvedValue(asset);

    const result = await resolveScanTarget("AST-0047", APP_ORIGIN, {
      fetchById,
      fetchByTag,
    });

    expect(result).toEqual({ status: "asset", asset });
    expect(fetchById).not.toHaveBeenCalled();
    expect(fetchByTag).toHaveBeenCalledWith("AST-0047");
  });

  it("does not call fetchByTag when the input looks like a URL on another origin", async () => {
    const fetchById = vi.fn();
    const fetchByTag = vi.fn();

    const result = await resolveScanTarget(
      "https://evil.example.com/assets/abc",
      APP_ORIGIN,
      { fetchById, fetchByTag },
    );

    expect(result.status).toBe("unresolved");
    expect(fetchById).not.toHaveBeenCalled();
    expect(fetchByTag).not.toHaveBeenCalled();
  });

  it("does not call fetchByTag for inputs with whitespace or non-tag characters", async () => {
    const fetchById = vi.fn();
    const fetchByTag = vi.fn();

    const result = await resolveScanTarget("hello world", APP_ORIGIN, {
      fetchById,
      fetchByTag,
    });

    expect(result.status).toBe("unresolved");
    expect(fetchByTag).not.toHaveBeenCalled();
  });

  it("returns unresolved when fetchByTag returns null", async () => {
    const fetchById = vi.fn();
    const fetchByTag = vi.fn().mockResolvedValue(null);

    const result = await resolveScanTarget("AST-9999", APP_ORIGIN, {
      fetchById,
      fetchByTag,
    });

    expect(result).toEqual({ status: "unresolved", rawText: "AST-9999" });
  });

  it("returns unresolved for empty and whitespace-only input without calling any lookup", async () => {
    const fetchById = vi.fn();
    const fetchByTag = vi.fn();

    expect(
      await resolveScanTarget("", APP_ORIGIN, { fetchById, fetchByTag }),
    ).toEqual({ status: "unresolved", rawText: "" });
    expect(
      await resolveScanTarget("   ", APP_ORIGIN, { fetchById, fetchByTag }),
    ).toEqual({ status: "unresolved", rawText: "" });
    expect(fetchById).not.toHaveBeenCalled();
    expect(fetchByTag).not.toHaveBeenCalled();
  });
});

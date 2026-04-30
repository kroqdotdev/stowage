import type { AssetDetail } from "@/lib/api/assets";
import { getAsset, getAssetByTag } from "@/lib/api/assets";

export type ResolverResult =
  | { status: "asset"; asset: AssetDetail }
  | { status: "unresolved"; rawText: string };

export type ResolverLookups = {
  fetchById?: (id: string) => Promise<AssetDetail | null>;
  fetchByTag?: (tag: string) => Promise<AssetDetail | null>;
};

export function extractStowageAssetId(
  text: string,
  appOrigin: string,
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const expectedOrigin = stripTrailingSlash(appOrigin);
  if (stripTrailingSlash(parsed.origin) !== expectedOrigin) {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const assetsIndex = segments.indexOf("assets");
  if (assetsIndex === -1) return null;
  const id = segments[assetsIndex + 1];
  if (!id) return null;
  return id;
}

export async function resolveScanTarget(
  text: string,
  appOrigin: string,
  lookups: ResolverLookups = {},
): Promise<ResolverResult> {
  const raw = text?.trim() ?? "";
  if (!raw) {
    return { status: "unresolved", rawText: raw };
  }

  const fetchById = lookups.fetchById ?? getAsset;
  const fetchByTag = lookups.fetchByTag ?? getAssetByTag;

  const id = extractStowageAssetId(raw, appOrigin);
  if (id) {
    const asset = await safeLookup(() => fetchById(id));
    if (asset) return { status: "asset", asset };
    return { status: "unresolved", rawText: raw };
  }

  // Bare asset tag (manual entry). Only try this for inputs that look like an
  // asset tag rather than a random URL — prevents us from accidentally sending
  // arbitrary decoded text to a server-side search.
  if (looksLikeAssetTag(raw)) {
    const asset = await safeLookup(() => fetchByTag(raw));
    if (asset) return { status: "asset", asset };
  }

  return { status: "unresolved", rawText: raw };
}

async function safeLookup(
  fn: () => Promise<AssetDetail | null>,
): Promise<AssetDetail | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn("safeLookup failed while resolving a scanned asset", error);
    return null;
  }
}

function looksLikeAssetTag(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  if (/\s/.test(value)) return false;
  if (/^https?:/i.test(value)) return false;
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

import type { Ctx } from "@/server/pb/context";
import type { AssetStatus } from "@/server/pb/assets";

export type AssetSearchResult = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryName: string | null;
  locationPath: string | null;
};

type AssetRow = {
  id: string;
  name: string;
  normalizedName: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string;
  locationId: string;
  notes: string;
  updatedAt: number;
};

type CategoryRow = { id: string; name: string };
type LocationRow = { id: string; path: string };

function normalizeTerm(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getMatchScore(asset: AssetRow, needle: string) {
  const assetTag = asset.assetTag.toLocaleLowerCase();
  const name = asset.normalizedName;
  const notes = (asset.notes ?? "").toLocaleLowerCase();
  let score = 0;

  if (assetTag === needle) score += 600;
  else if (assetTag.startsWith(needle)) score += 450;
  else if (assetTag.includes(needle)) score += 320;

  if (name === needle) score += 420;
  else if (name.startsWith(needle)) score += 300;
  else if (name.includes(needle)) score += 180;

  if (notes.includes(needle)) score += 90;
  return score;
}

/**
 * Lightweight weighted search. The FTS5 virtual table on the assets collection
 * is available for a future upgrade to bm25-style ranking once we need it; at
 * current data volumes the scan is cheap enough and the scoring rules are
 * easier to tweak in TypeScript.
 */
export async function searchAssets(
  ctx: Ctx,
  term: string,
  limit = 10,
): Promise<AssetSearchResult[]> {
  const needle = normalizeTerm(term);
  if (needle.length < 2) return [];
  const cappedLimit = Math.max(1, Math.min(limit, 10));

  const assets = await ctx.pb.collection("assets").getFullList<AssetRow>();

  type Match = { asset: AssetRow; score: number };
  const matches: Match[] = assets
    .map((asset) => ({ asset, score: getMatchScore(asset, needle) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.asset.updatedAt !== left.asset.updatedAt) {
        return right.asset.updatedAt - left.asset.updatedAt;
      }
      return left.asset.name.localeCompare(right.asset.name, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, cappedLimit);

  const categoryIds = [
    ...new Set(
      matches.map((match) => match.asset.categoryId).filter((id) => !!id),
    ),
  ];
  const locationIds = [
    ...new Set(
      matches.map((match) => match.asset.locationId).filter((id) => !!id),
    ),
  ];

  const [categories, locations] = await Promise.all([
    Promise.all(
      categoryIds.map((id) =>
        ctx.pb
          .collection("categories")
          .getOne<CategoryRow>(id)
          .catch(() => null),
      ),
    ),
    Promise.all(
      locationIds.map((id) =>
        ctx.pb
          .collection("locations")
          .getOne<LocationRow>(id)
          .catch(() => null),
      ),
    ),
  ]);

  const categoryById = new Map(
    (categories.filter(Boolean) as CategoryRow[]).map((c) => [c.id, c]),
  );
  const locationById = new Map(
    (locations.filter(Boolean) as LocationRow[]).map((l) => [l.id, l]),
  );

  return matches.map(({ asset }) => ({
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    status: asset.status,
    categoryName: asset.categoryId
      ? (categoryById.get(asset.categoryId)?.name ?? null)
      : null,
    locationPath: asset.locationId
      ? (locationById.get(asset.locationId)?.path ?? null)
      : null,
  }));
}

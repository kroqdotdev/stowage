import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireAuthenticatedUser } from "./authz";

const assetStatusValidator = v.union(
  v.literal("active"),
  v.literal("in_storage"),
  v.literal("under_repair"),
  v.literal("retired"),
  v.literal("disposed"),
);

const searchResultValidator = v.object({
  _id: v.id("assets"),
  name: v.string(),
  assetTag: v.string(),
  status: assetStatusValidator,
  categoryName: v.union(v.string(), v.null()),
  locationPath: v.union(v.string(), v.null()),
});

type AssetStatus =
  | "active"
  | "in_storage"
  | "under_repair"
  | "retired"
  | "disposed";

type AssetRow = {
  _id: Id<"assets">;
  name: string;
  normalizedName: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: Id<"categories"> | null;
  locationId: Id<"locations"> | null;
  notes: string | null;
  updatedAt: number;
};

type CategoryRow = {
  _id: Id<"categories">;
  name: string;
};

type LocationRow = {
  _id: Id<"locations">;
  path: string;
};

type SearchMatch = {
  asset: AssetRow;
  score: number;
};

function normalizeTerm(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getMatchScore(asset: AssetRow, normalizedTerm: string) {
  const assetTag = asset.assetTag.toLocaleLowerCase();
  const name = asset.normalizedName;
  const notes = asset.notes?.toLocaleLowerCase() ?? "";

  let score = 0;

  if (assetTag === normalizedTerm) {
    score += 600;
  } else if (assetTag.startsWith(normalizedTerm)) {
    score += 450;
  } else if (assetTag.includes(normalizedTerm)) {
    score += 320;
  }

  if (name === normalizedTerm) {
    score += 420;
  } else if (name.startsWith(normalizedTerm)) {
    score += 300;
  } else if (name.includes(normalizedTerm)) {
    score += 180;
  }

  if (notes.includes(normalizedTerm)) {
    score += 90;
  }

  return score;
}

export const searchAssets = query({
  args: {
    term: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const normalizedTerm = normalizeTerm(args.term);
    if (normalizedTerm.length < 2) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 10, 10));

    // Full table scan is intentional: Convex search indexes support only a
    // single searchField, but we need to match across name, assetTag, and
    // notes simultaneously with weighted scoring. The search_assets index is
    // available for simple name-only lookups elsewhere.
    const assets = (await ctx.db.query("assets").collect()) as AssetRow[];

    const matches: SearchMatch[] = assets
      .map((asset) => ({
        asset,
        score: getMatchScore(asset, normalizedTerm),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left: SearchMatch, right: SearchMatch) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.asset.updatedAt !== left.asset.updatedAt) {
          return right.asset.updatedAt - left.asset.updatedAt;
        }

        return left.asset.name.localeCompare(right.asset.name, undefined, {
          sensitivity: "base",
        });
      })
      .slice(0, limit);

    const categoryIds = Array.from(
      new Set(
        matches
          .map((entry: SearchMatch) => entry.asset.categoryId)
          .filter(
            (value): value is Id<"categories"> => value !== null,
          ),
      ),
    );
    const locationIds = Array.from(
      new Set(
        matches
          .map((entry: SearchMatch) => entry.asset.locationId)
          .filter((value): value is Id<"locations"> => value !== null),
      ),
    );

    const [categories, locations] = await Promise.all([
      Promise.all(
        categoryIds.map((categoryId) =>
          ctx.db.get(categoryId) as Promise<CategoryRow | null>,
        ),
      ),
      Promise.all(
        locationIds.map((locationId) =>
          ctx.db.get(locationId) as Promise<LocationRow | null>,
        ),
      ),
    ]);

    const categoryById = new Map<Id<"categories">, CategoryRow>();
    for (const category of categories) {
      if (category) {
        categoryById.set(category._id, {
          _id: category._id,
          name: category.name,
        });
      }
    }

    const locationById = new Map<Id<"locations">, LocationRow>();
    for (const location of locations) {
      if (location) {
        locationById.set(location._id, {
          _id: location._id,
          path: location.path,
        });
      }
    }

    return matches.map(({ asset }: SearchMatch) => ({
      _id: asset._id,
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
  },
});

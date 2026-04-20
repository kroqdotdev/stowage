import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateAssetInput,
  ListAssetsInput,
  createAsset,
  listAssets,
} from "@/server/domain/assets";

const ClientCreateAsset = CreateAssetInput.omit({ actorId: true });

export const GET = withUser("api/assets", async (req, session) => {
  const url = new URL(req.url);
  const raw = {
    categoryId: url.searchParams.get("categoryId") ?? undefined,
    locationId: url.searchParams.get("locationId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    tagIds: url.searchParams.getAll("tagId"),
    search: url.searchParams.get("search") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDirection: url.searchParams.get("sortDirection") ?? undefined,
  };
  const parsed = ListAssetsInput.parse(
    Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))),
  );
  const assets = await listAssets(session.ctx, parsed);
  return { assets };
});

export const POST = withAdmin("api/assets", async (req, session, user) => {
  const body = ClientCreateAsset.parse(await parseJsonBody(req));
  const { assetId } = await createAsset(session.ctx, {
    ...body,
    actorId: user.id,
  });
  return NextResponse.json({ assetId }, { status: 201 });
});

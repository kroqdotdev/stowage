import { withUser } from "@/server/auth/route";
import { getAssetsForLabels } from "@/server/domain/assets";

export const GET = withUser("api/assets/for-labels", async (req, session) => {
  const url = new URL(req.url);
  const assetIds = url.searchParams.getAll("assetId");
  const assets = await getAssetsForLabels(session.ctx, assetIds);
  return { assets };
});

import { withUser } from "@/server/auth/route";
import { searchAssets } from "@/server/domain/search";

export const GET = withUser("api/search", async (req, session) => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const results = await searchAssets(session.ctx, query);
  return { results };
});

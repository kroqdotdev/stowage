import { withUser } from "@/server/auth/route";
import { getOverview } from "@/server/domain/dashboard";

export const GET = withUser("api/dashboard", async (_req, session) => {
  const overview = await getOverview(session.ctx);
  return { overview };
});

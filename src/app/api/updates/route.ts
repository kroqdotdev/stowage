import { withAdmin } from "@/server/auth/route";
import { getUpdatesView } from "@/server/updates";

export const dynamic = "force-dynamic";

export const GET = withAdmin("api/updates", async (req) => {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  return getUpdatesView({ refresh });
});

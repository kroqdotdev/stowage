import { withUser } from "@/server/auth/route";
import { getAssetFilterOptions } from "@/server/domain/assets";

export const GET = withUser(
  "api/assets/filter-options",
  async (_req, session) => {
    const options = await getAssetFilterOptions(session.ctx);
    return { options };
  },
);

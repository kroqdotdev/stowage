import { withUser } from "@/server/auth/route";
import { getStorageUsage } from "@/server/pb/storage-quota";

export const GET = withUser("api/storage-usage", async (_req, session) => ({
  usage: await getStorageUsage(session.ctx),
}));

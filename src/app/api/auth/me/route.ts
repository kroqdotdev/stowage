import { withSession } from "@/server/auth/route";

export const GET = withSession("api/auth/me", async (_req, session) => ({
  user: session.user,
}));

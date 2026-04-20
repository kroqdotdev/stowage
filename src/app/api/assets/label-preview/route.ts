import { withUser } from "@/server/auth/route";
import { getLabelPreviewAsset } from "@/server/domain/assets";

export const GET = withUser(
  "api/assets/label-preview",
  async (_req, session) => {
    const asset = await getLabelPreviewAsset(session.ctx);
    return { asset };
  },
);

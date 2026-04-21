import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { generateAssetTag } from "@/server/domain/assets";

const QuerySchema = z.object({ categoryId: z.string().nullable() });

export const GET = withUser("api/assets/preview-tag", async (req, session) => {
  const url = new URL(req.url);
  const raw = url.searchParams.get("categoryId");
  const { categoryId } = QuerySchema.parse({ categoryId: raw ?? null });
  const preview = await generateAssetTag(session.ctx, categoryId);
  return { preview };
});

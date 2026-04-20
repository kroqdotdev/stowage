import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateCategoryInput,
  createCategory,
  listCategories,
} from "@/server/domain/categories";

export const GET = withUser("api/categories", async (_req, session) => ({
  categories: await listCategories(session.ctx),
}));

export const POST = withAdmin("api/categories", async (req, session) => {
  const body = CreateCategoryInput.parse(await parseJsonBody(req));
  const category = await createCategory(session.ctx, body);
  return NextResponse.json({ category }, { status: 201 });
});

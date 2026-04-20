import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateCategoryInput,
  deleteCategory,
  updateCategory,
} from "@/server/domain/categories";

const ClientUpdateCategory = UpdateCategoryInput.omit({ categoryId: true });

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/categories/[id]",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateCategory.parse(await parseJsonBody(req));
    const category = await updateCategory(session.ctx, {
      ...body,
      categoryId: id,
    });
    return { category };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/categories/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteCategory(session.ctx, id);
    return { ok: true };
  },
);

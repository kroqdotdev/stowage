import { parseJsonBody, withUser } from "@/server/auth/route";
import {
  UpdateRecordInput,
  deleteRecord,
  updateRecord,
} from "@/server/domain/serviceRecords";

const ClientUpdate = UpdateRecordInput.omit({
  recordId: true,
  actorId: true,
  actorRole: true,
});

export const PATCH = withUser<unknown, { id: string }>(
  "api/service-records/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdate.parse(await parseJsonBody(req));
    await updateRecord(session.ctx, {
      ...body,
      recordId: id,
      actorId: user.id,
      actorRole: user.role,
    });
    return { ok: true };
  },
);

export const DELETE = withUser<unknown, { id: string }>(
  "api/service-records/[id]",
  async (_req, session, user, { params }) => {
    const { id } = await params;
    await deleteRecord(session.ctx, id, { id: user.id, role: user.role });
    return { ok: true };
  },
);

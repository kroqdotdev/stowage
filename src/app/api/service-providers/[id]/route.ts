import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateProviderInput,
  deleteProvider,
  updateProvider,
} from "@/server/domain/serviceProviders";

const ClientUpdateProvider = UpdateProviderInput.omit({
  providerId: true,
  actorId: true,
});

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/service-providers/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateProvider.parse(await parseJsonBody(req));
    const provider = await updateProvider(session.ctx, {
      ...body,
      providerId: id,
      actorId: user.id,
    });
    return { provider };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/service-providers/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteProvider(session.ctx, id);
    return { ok: true };
  },
);

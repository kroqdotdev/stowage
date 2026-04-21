import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpdateLocationInput,
  deleteLocation,
  getLocationChildren,
  getLocationPath,
  updateLocation,
} from "@/server/domain/locations";

const ClientUpdateLocation = UpdateLocationInput.omit({ locationId: true });

export const GET = withUser<unknown, { id: string }>(
  "api/locations/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const [children, path] = await Promise.all([
      getLocationChildren(session.ctx, id),
      getLocationPath(session.ctx, id),
    ]);
    return { children, path };
  },
);

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/locations/[id]",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateLocation.parse(await parseJsonBody(req));
    const location = await updateLocation(session.ctx, {
      ...body,
      locationId: id,
    });
    return { location };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/locations/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteLocation(session.ctx, id);
    return { ok: true };
  },
);

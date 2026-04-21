import { parseJsonBody, withAdmin } from "@/server/auth/route";
import { MoveLocationInput, moveLocation } from "@/server/domain/locations";

const ClientMoveLocation = MoveLocationInput.omit({ locationId: true });

export const POST = withAdmin<unknown, { id: string }>(
  "api/locations/[id]/move",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = ClientMoveLocation.parse(await parseJsonBody(req));
    const location = await moveLocation(session.ctx, {
      ...body,
      locationId: id,
    });
    return { location };
  },
);

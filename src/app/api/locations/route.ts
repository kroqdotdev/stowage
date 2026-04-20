import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateLocationInput,
  createLocation,
  listLocations,
} from "@/server/domain/locations";

export const GET = withUser("api/locations", async (_req, session) => ({
  locations: await listLocations(session.ctx),
}));

export const POST = withAdmin("api/locations", async (req, session) => {
  const body = CreateLocationInput.parse(await parseJsonBody(req));
  const location = await createLocation(session.ctx, body);
  return NextResponse.json({ location }, { status: 201 });
});

import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateProviderInput,
  createProvider,
  listProviderOptions,
  listProviders,
} from "@/server/domain/serviceProviders";

const ClientCreateProvider = CreateProviderInput.omit({ actorId: true });

export const GET = withUser("api/service-providers", async (req, session) => {
  const variant = new URL(req.url).searchParams.get("variant");
  if (variant === "options") {
    return { providers: await listProviderOptions(session.ctx) };
  }
  return { providers: await listProviders(session.ctx) };
});

export const POST = withAdmin(
  "api/service-providers",
  async (req, session, user) => {
    const body = ClientCreateProvider.parse(await parseJsonBody(req));
    const provider = await createProvider(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json({ provider }, { status: 201 });
  },
);

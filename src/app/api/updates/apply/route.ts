import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withAdmin } from "@/server/auth/route";
import { applyUpdate } from "@/server/updates";

const Body = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Invalid version"),
});

export const POST = withAdmin("api/updates/apply", async (req) => {
  const body = Body.parse(await parseJsonBody(req));
  const status = await applyUpdate(body.version);
  return NextResponse.json({ status }, { status: 202 });
});

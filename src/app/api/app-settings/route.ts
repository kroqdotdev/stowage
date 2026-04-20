import { z } from "zod";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpdateDateFormatInput,
  UpdateServiceSchedulingEnabledInput,
  getAppSettings,
  updateDateFormat,
  updateServiceSchedulingEnabled,
} from "@/server/domain/appSettings";

const ClientDateFormat = UpdateDateFormatInput.omit({ actorId: true });
const ClientServiceScheduling = UpdateServiceSchedulingEnabledInput.omit({
  actorId: true,
});
const PatchBody = z.union([
  z.object({ kind: z.literal("dateFormat") }).and(ClientDateFormat),
  z.object({ kind: z.literal("serviceScheduling") }).and(ClientServiceScheduling),
]);

export const GET = withUser("api/app-settings", async (_req, session) => ({
  settings: await getAppSettings(session.ctx),
}));

export const PATCH = withAdmin("api/app-settings", async (req, session, user) => {
  const body = PatchBody.parse(await parseJsonBody(req));
  if (body.kind === "dateFormat") {
    const settings = await updateDateFormat(session.ctx, {
      dateFormat: body.dateFormat,
      actorId: user.id,
    });
    return { settings };
  }
  const settings = await updateServiceSchedulingEnabled(session.ctx, {
    enabled: body.enabled,
    actorId: user.id,
  });
  return { settings };
});

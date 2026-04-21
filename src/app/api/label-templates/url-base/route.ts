import { withUser } from "@/server/auth/route";
import { getLabelUrlBase } from "@/server/domain/labelTemplates";

export const GET = withUser("api/label-templates/url-base", async () => {
  return { base: getLabelUrlBase() };
});

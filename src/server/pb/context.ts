import type PocketBase from "pocketbase";

import { getPbAdmin } from "./client";

export type Ctx = {
  pb: PocketBase;
};

export async function createAdminCtx(): Promise<Ctx> {
  const pb = await getPbAdmin();
  return { pb };
}

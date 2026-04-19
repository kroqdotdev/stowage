import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import {
  APP_DATE_FORMATS,
  type AppDateFormat,
} from "@/server/pb/custom-fields";
import type { Ctx } from "@/server/pb/context";
import { ValidationError } from "@/server/pb/errors";

const DEFAULT_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY";
const DEFAULT_SERVICE_SCHEDULING_ENABLED = true;

const dateFormatSchema = z.enum(APP_DATE_FORMATS);

export const UpdateDateFormatInput = z.object({
  dateFormat: dateFormatSchema,
  actorId: z.string(),
});
export const UpdateServiceSchedulingEnabledInput = z.object({
  enabled: z.boolean(),
  actorId: z.string(),
});

export type AppSettingsView = {
  dateFormat: AppDateFormat;
  serviceSchedulingEnabled: boolean;
  updatedAt: number | null;
};

type AppSettingsRecord = {
  id: string;
  key: "global";
  dateFormat: AppDateFormat;
  serviceSchedulingEnabled?: boolean | null;
  updatedAt: number;
  updatedBy: string;
};

function toView(record: AppSettingsRecord | null): AppSettingsView {
  if (!record) {
    return {
      dateFormat: DEFAULT_DATE_FORMAT,
      serviceSchedulingEnabled: DEFAULT_SERVICE_SCHEDULING_ENABLED,
      updatedAt: null,
    };
  }
  return {
    dateFormat: record.dateFormat,
    serviceSchedulingEnabled:
      record.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED,
    updatedAt: record.updatedAt,
  };
}

async function getGlobalRecord(
  ctx: Ctx,
): Promise<AppSettingsRecord | null> {
  try {
    return await ctx.pb
      .collection("appSettings")
      .getFirstListItem<AppSettingsRecord>('key = "global"');
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getAppSettings(ctx: Ctx): Promise<AppSettingsView> {
  return toView(await getGlobalRecord(ctx));
}

export async function updateDateFormat(
  ctx: Ctx,
  input: z.infer<typeof UpdateDateFormatInput>,
): Promise<AppSettingsView> {
  const parsed = UpdateDateFormatInput.parse(input);
  const existing = await getGlobalRecord(ctx);
  const now = Date.now();
  const nextEnabled =
    existing?.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED;

  if (existing) {
    await ctx.pb.collection("appSettings").update(existing.id, {
      dateFormat: parsed.dateFormat,
      serviceSchedulingEnabled: nextEnabled,
      updatedAt: now,
      updatedBy: parsed.actorId,
    });
  } else {
    try {
      await ctx.pb.collection("appSettings").create({
        key: "global",
        dateFormat: parsed.dateFormat,
        serviceSchedulingEnabled: nextEnabled,
        updatedAt: now,
        updatedBy: parsed.actorId,
      });
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 400) {
        throw new ValidationError(
          "Failed to create app settings — check updatedBy user exists",
        );
      }
      throw error;
    }
  }

  return {
    dateFormat: parsed.dateFormat,
    serviceSchedulingEnabled: nextEnabled,
    updatedAt: now,
  };
}

export async function updateServiceSchedulingEnabled(
  ctx: Ctx,
  input: z.infer<typeof UpdateServiceSchedulingEnabledInput>,
): Promise<AppSettingsView> {
  const parsed = UpdateServiceSchedulingEnabledInput.parse(input);
  const existing = await getGlobalRecord(ctx);
  const now = Date.now();
  const dateFormat = existing?.dateFormat ?? DEFAULT_DATE_FORMAT;

  if (existing) {
    await ctx.pb.collection("appSettings").update(existing.id, {
      dateFormat,
      serviceSchedulingEnabled: parsed.enabled,
      updatedAt: now,
      updatedBy: parsed.actorId,
    });
  } else {
    await ctx.pb.collection("appSettings").create({
      key: "global",
      dateFormat,
      serviceSchedulingEnabled: parsed.enabled,
      updatedAt: now,
      updatedBy: parsed.actorId,
    });
  }

  return {
    dateFormat,
    serviceSchedulingEnabled: parsed.enabled,
    updatedAt: now,
  };
}

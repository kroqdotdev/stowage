"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  APP_DATE_FORMAT_OPTIONS,
  DEFAULT_APP_DATE_FORMAT,
  formatDateFromTimestamp,
  type AppDateFormat,
} from "@/lib/date-format";
import { getConvexErrorCode, getConvexUiMessage } from "@/lib/convex-errors";
import { api } from "@/lib/convex-api";

function mapSettingsError(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error);
  if (code === "FORBIDDEN") {
    return "Only admins can update regional settings.";
  }
  if (code === "INVALID_DATE_FORMAT") {
    return "Select one of the supported date formats.";
  }
  return getConvexUiMessage(error, fallback);
}

export function RegionalSettingsSection() {
  const settings = useQuery(api.appSettings.getAppSettings, {});
  const updateDateFormat = useMutation(api.appSettings.updateDateFormat);
  const updateServiceSchedulingEnabled = useMutation(
    api.appSettings.updateServiceSchedulingEnabled,
  );

  const [selectedFormat, setSelectedFormat] = useState<AppDateFormat | null>(
    null,
  );
  const [selectedSchedulingEnabled, setSelectedSchedulingEnabled] = useState<
    boolean | null
  >(null);
  const [saving, setSaving] = useState(false);

  const persistedFormat =
    (settings?.dateFormat as AppDateFormat | undefined) ??
    DEFAULT_APP_DATE_FORMAT;
  const persistedSchedulingEnabled = settings?.serviceSchedulingEnabled ?? true;
  const effectiveFormat = selectedFormat ?? persistedFormat;
  const effectiveSchedulingEnabled =
    selectedSchedulingEnabled ?? persistedSchedulingEnabled;

  const hasChanges =
    settings !== undefined &&
    (effectiveFormat !== persistedFormat ||
      effectiveSchedulingEnabled !== persistedSchedulingEnabled);

  async function handleSave() {
    setSaving(true);
    try {
      if (effectiveFormat !== persistedFormat) {
        await updateDateFormat({ dateFormat: effectiveFormat });
      }

      if (effectiveSchedulingEnabled !== persistedSchedulingEnabled) {
        await updateServiceSchedulingEnabled({
          enabled: effectiveSchedulingEnabled,
        });
      }

      setSelectedFormat(null);
      setSelectedSchedulingEnabled(null);
      toast.success("Settings updated");
    } catch (error) {
      toast.error(mapSettingsError(error, "Unable to update settings"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Regional preferences
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose how dates are displayed across the app.
        </p>
      </div>

      {settings === undefined ? (
        <div className="mt-4 text-sm text-muted-foreground">
          Loading preferences...
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="app-date-format" className="text-sm font-medium">
              Date format
            </label>
            <select
              id="app-date-format"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
              value={effectiveFormat}
              onChange={(event) =>
                setSelectedFormat(event.target.value as AppDateFormat)
              }
              disabled={saving}
            >
              {APP_DATE_FORMAT_OPTIONS.map((formatOption) => (
                <option key={formatOption} value={formatOption}>
                  {formatOption}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
            <p className="text-sm font-medium">Preventive service scheduling</p>
            <p className="text-xs text-muted-foreground">
              When disabled, schedule inputs and services planner views are
              hidden, but existing schedules are preserved.
            </p>
            <label className="mt-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={effectiveSchedulingEnabled}
                disabled={saving}
                onChange={(event) =>
                  setSelectedSchedulingEnabled(event.target.checked)
                }
              />
              Enabled
            </label>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <div>
              Preview:{" "}
              <span className="font-medium text-foreground">
                {formatDateFromTimestamp(
                  Date.UTC(2026, 1, 27),
                  effectiveFormat,
                )}
              </span>
            </div>
            {settings.updatedAt ? (
              <div className="mt-1 text-xs">
                Last updated:{" "}
                {formatDateFromTimestamp(
                  settings.updatedAt,
                  settings.dateFormat as AppDateFormat,
                )}
              </div>
            ) : (
              <div className="mt-1 text-xs">Using default format.</div>
            )}
          </div>

          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => void handleSave()}
            disabled={saving || !hasChanges}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save settings
          </Button>
        </div>
      )}
    </section>
  );
}

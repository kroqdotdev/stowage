"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    return "Only admins can update settings.";
  }
  if (code === "INVALID_DATE_FORMAT") {
    return "Select one of the supported date formats.";
  }
  return getConvexUiMessage(error, fallback);
}

export function RegionalSettingsSection() {
  const settings = useQuery(api.appSettings.getAppSettings, {});
  const updateDateFormat = useMutation(api.appSettings.updateDateFormat);

  const [selectedFormat, setSelectedFormat] = useState<AppDateFormat | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const persistedFormat =
    (settings?.dateFormat as AppDateFormat | undefined) ??
    DEFAULT_APP_DATE_FORMAT;
  const effectiveFormat = selectedFormat ?? persistedFormat;

  const hasChanges =
    settings !== undefined && effectiveFormat !== persistedFormat;

  async function handleSave() {
    setSaving(true);
    try {
      await updateDateFormat({ dateFormat: effectiveFormat });
      setSelectedFormat(null);
      toast.success("Date format updated");
    } catch (error) {
      toast.error(mapSettingsError(error, "Unable to update date format"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Date format</h2>
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
            <label className="text-sm font-medium">Format</label>
            <Select
              value={effectiveFormat}
              onValueChange={(value) =>
                setSelectedFormat(value as AppDateFormat)
              }
              disabled={saving}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_DATE_FORMAT_OPTIONS.map((formatOption) => (
                  <SelectItem key={formatOption} value={formatOption}>
                    {formatOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Save format
          </Button>
        </div>
      )}
    </section>
  );
}

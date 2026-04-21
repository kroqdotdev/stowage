"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ApiRequestError } from "@/lib/api-client";
import { getAppSettings, setDateFormat } from "@/lib/api/app-settings";

function mapSettingsError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can update settings.";
    }
    return error.message || fallback;
  }
  return fallback;
}

export function RegionalSettingsSection() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  const mutation = useMutation({
    mutationFn: (format: AppDateFormat) => setDateFormat(format),
    onSuccess: () => {
      setSelectedFormat(null);
      toast.success("Date format updated");
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (error) => {
      toast.error(mapSettingsError(error, "Unable to update date format"));
    },
  });

  const [selectedFormat, setSelectedFormat] = useState<AppDateFormat | null>(
    null,
  );

  const persistedFormat =
    (settingsQuery.data?.dateFormat as AppDateFormat | undefined) ??
    DEFAULT_APP_DATE_FORMAT;
  const effectiveFormat = selectedFormat ?? persistedFormat;
  const hasChanges =
    !settingsQuery.isPending && effectiveFormat !== persistedFormat;

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Date format</h2>
        <p className="text-sm text-muted-foreground">
          Choose how dates are displayed across the app.
        </p>
      </div>

      {settingsQuery.isPending ? (
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
              disabled={mutation.isPending}
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
            {settingsQuery.data?.updatedAt ? (
              <div className="mt-1 text-xs">
                Last updated:{" "}
                {formatDateFromTimestamp(
                  settingsQuery.data.updatedAt,
                  settingsQuery.data.dateFormat as AppDateFormat,
                )}
              </div>
            ) : (
              <div className="mt-1 text-xs">Using default format.</div>
            )}
          </div>

          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => mutation.mutate(effectiveFormat)}
            disabled={mutation.isPending || !hasChanges}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save format
          </Button>
        </div>
      )}
    </section>
  );
}

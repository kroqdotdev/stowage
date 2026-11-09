"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SheetHeading } from "@/components/ui/sheet-heading";
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
    <section aria-labelledby="settings-date-format-title">
      <SheetHeading
        title={<span id="settings-date-format-title">Date format</span>}
      />

      {settingsQuery.isPending ? (
        <p className="py-4 text-sm text-muted-foreground">
          Loading preferences...
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-0.5 pt-4">
          <div className="w-full space-y-1.5 sm:w-64">
            <label
              id="settings-date-format-label"
              className="text-sm font-semibold"
            >
              Format
            </label>
            <Select
              value={effectiveFormat}
              onValueChange={(value) =>
                setSelectedFormat(value as AppDateFormat)
              }
              disabled={mutation.isPending}
            >
              <SelectTrigger
                className="w-full"
                aria-labelledby="settings-date-format-label"
              >
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

          <div className="min-w-0 flex-1 pb-0.5 text-sm text-ink-2">
            <div>
              Preview:{" "}
              <span className="font-mono font-medium text-foreground">
                {formatDateFromTimestamp(
                  Date.UTC(2026, 1, 27),
                  effectiveFormat,
                )}
              </span>
            </div>
            {settingsQuery.data?.updatedAt ? (
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                Last updated:{" "}
                {formatDateFromTimestamp(
                  settingsQuery.data.updatedAt,
                  settingsQuery.data.dateFormat as AppDateFormat,
                )}
              </div>
            ) : (
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                Using default format.
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => mutation.mutate(effectiveFormat)}
            disabled={mutation.isPending || !hasChanges}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Save format
          </Button>
        </div>
      )}
    </section>
  );
}

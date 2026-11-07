"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Switch } from "@/components/ui/switch";
import { ApiRequestError } from "@/lib/api-client";
import {
  getAppSettings,
  setServiceSchedulingEnabled,
} from "@/lib/api/app-settings";

function mapError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can update feature settings.";
    }
    return error.message || fallback;
  }
  return fallback;
}

export function FeaturesSection() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setServiceSchedulingEnabled(enabled),
    onSuccess: (_data, enabled) => {
      toast.success(
        enabled ? "Service scheduling enabled" : "Service scheduling disabled",
      );
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (error) => {
      toast.error(mapError(error, "Unable to update feature setting"));
    },
  });

  const enabled = settingsQuery.data?.serviceSchedulingEnabled ?? true;

  return (
    <section aria-labelledby="settings-features-title">
      <SheetHeading
        title={<span id="settings-features-title">Features</span>}
      />

      {settingsQuery.isPending ? (
        <p className="py-4 text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="flex items-start justify-between gap-6 border-b border-border px-0.5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Preventive service scheduling
            </p>
            <p className="mt-0.5 max-w-[60ch] text-sm text-ink-2">
              When disabled, schedule inputs and services planner views are
              hidden, but existing schedules are preserved.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
            <span
              className="text-[13px] font-medium text-ink-2"
              aria-hidden="true"
            >
              {enabled ? "On" : "Off"}
            </span>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => mutation.mutate(checked)}
              disabled={mutation.isPending}
              aria-label="Toggle service scheduling"
            />
          </div>
        </div>
      )}
    </section>
  );
}

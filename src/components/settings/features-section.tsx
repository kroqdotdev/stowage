"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Features</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable optional features.
        </p>
      </div>

      {settingsQuery.isPending ? (
        <div className="mt-4 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="mt-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Preventive service scheduling
              </p>
              <p className="text-xs text-muted-foreground">
                When disabled, schedule inputs and services planner views are
                hidden, but existing schedules are preserved.
              </p>
            </div>
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

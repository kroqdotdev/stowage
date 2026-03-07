"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getConvexErrorCode, getConvexUiMessage } from "@/lib/convex-errors";
import { api } from "@/lib/convex-api";

function mapError(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error);
  if (code === "FORBIDDEN") {
    return "Only admins can update feature settings.";
  }
  return getConvexUiMessage(error, fallback);
}

export function FeaturesSection() {
  const settings = useQuery(api.appSettings.getAppSettings, {});
  const updateServiceSchedulingEnabled = useMutation(
    api.appSettings.updateServiceSchedulingEnabled,
  );

  const [saving, setSaving] = useState(false);

  const enabled = settings?.serviceSchedulingEnabled ?? true;

  async function handleToggle(checked: boolean) {
    setSaving(true);
    try {
      await updateServiceSchedulingEnabled({ enabled: checked });
      toast.success(
        checked ? "Service scheduling enabled" : "Service scheduling disabled",
      );
    } catch (error) {
      toast.error(mapError(error, "Unable to update feature setting"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Features</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable optional features.
        </p>
      </div>

      {settings === undefined ? (
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
              onCheckedChange={handleToggle}
              disabled={saving}
              aria-label="Toggle service scheduling"
            />
          </div>
        </div>
      )}
    </section>
  );
}

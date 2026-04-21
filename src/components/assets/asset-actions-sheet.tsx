"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Eye,
  MapPin,
  StickyNote,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import { StatusBadge } from "@/components/assets/status-badge";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetStatus,
} from "@/components/assets/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  updateAsset,
  updateAssetStatus,
  type AssetDetail,
} from "@/lib/api/assets";
import { uploadAttachment } from "@/lib/api/attachments";
import { listLocations, type Location } from "@/lib/api/locations";
import {
  createServiceRecord,
  type ServiceRecordValue,
} from "@/lib/api/service-records";
import { listServiceProviderOptions } from "@/lib/api/service-providers";
import { cn } from "@/lib/utils";

type View = "grid" | "status" | "move" | "note" | "service";

export type AssetActionsSheetProps = {
  open: boolean;
  asset: AssetDetail | null;
  onOpenChange: (open: boolean) => void;
  onAssetUpdated?: (asset: AssetDetail) => void;
  dismissLabel?: string;
  /** Test-id prefix so we can reuse the same component from scan vs list contexts. */
  testIdPrefix?: string;
};

export function AssetActionsSheet({
  open,
  asset,
  onOpenChange,
  onAssetUpdated,
  dismissLabel = "Dismiss ↓",
  testIdPrefix = "scan",
}: AssetActionsSheetProps) {
  const [view, setView] = useState<View>("grid");

  useEffect(() => {
    if (!open) return;
    setView("grid");
  }, [open, asset?.id]);

  if (!asset) return null;

  const title = view === "grid" ? asset.name : viewTitle(view);
  const description = view === "grid" ? asset.assetTag : undefined;

  return (
    <MobileActionSheet
      open={open}
      onOpenChange={(next) => (next ? null : onOpenChange(false))}
      title={title}
      description={description}
      hideHeader={view !== "grid"}
    >
      {view === "grid" ? (
        <>
          <ActionGrid
            asset={asset}
            onViewChange={setView}
            testIdPrefix={testIdPrefix}
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-1 w-full rounded-md px-3 py-2 text-center text-xs text-muted-foreground hover:bg-accent"
            data-testid={`${testIdPrefix}-result-dismiss`}
          >
            {dismissLabel}
          </button>
        </>
      ) : (
        <NestedView
          view={view}
          asset={asset}
          onBack={() => setView("grid")}
          onAssetUpdated={(updated) => onAssetUpdated?.(updated)}
          testIdPrefix={testIdPrefix}
        />
      )}
    </MobileActionSheet>
  );
}

function viewTitle(view: View): string {
  switch (view) {
    case "status":
      return "Change status";
    case "move":
      return "Move to location";
    case "note":
      return "Add a note";
    case "service":
      return "Log service";
    default:
      return "";
  }
}

function ActionGrid({
  asset,
  onViewChange,
  testIdPrefix,
}: {
  asset: AssetDetail;
  onViewChange: (view: View) => void;
  testIdPrefix: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(asset.id, file),
    onSuccess: () => {
      toast.success("Photo uploaded");
      void queryClient.invalidateQueries({
        queryKey: ["attachments", "list", asset.id],
      });
    },
    onError: () => {
      toast.error("Couldn't upload the photo. Try again from the asset page.");
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <header
        className="flex items-center gap-3"
        data-testid={`${testIdPrefix}-result-asset`}
        data-asset-id={asset.id}
      >
        <StatusBadge status={asset.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{asset.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {asset.assetTag}
          </p>
        </div>
      </header>
      <div
        className="grid grid-cols-3 gap-2"
        data-testid={`${testIdPrefix}-result-actions`}
      >
        <ActionTile
          label="View"
          icon={Eye}
          testId={`${testIdPrefix}-action-view`}
          asChild
        >
          <Link
            href={`/assets/${asset.id}`}
            data-testid={`${testIdPrefix}-result-view`}
          >
            <Eye className="h-5 w-5" aria-hidden="true" />
            <span>View</span>
          </Link>
        </ActionTile>
        <ActionTile
          label="Status"
          icon={ChevronRight}
          testId={`${testIdPrefix}-action-status`}
          onClick={() => onViewChange("status")}
        />
        <ActionTile
          label="Move"
          icon={MapPin}
          testId={`${testIdPrefix}-action-move`}
          onClick={() => onViewChange("move")}
        />
        <ActionTile
          label="Photo"
          icon={Camera}
          testId={`${testIdPrefix}-action-photo`}
          onClick={() => fileInputRef.current?.click()}
          busy={photoMutation.isPending}
        />
        <ActionTile
          label="Note"
          icon={StickyNote}
          testId={`${testIdPrefix}-action-note`}
          onClick={() => onViewChange("note")}
        />
        <ActionTile
          label="Service"
          icon={Wrench}
          testId={`${testIdPrefix}-action-service`}
          onClick={() => onViewChange("service")}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid={`${testIdPrefix}-photo-input`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            photoMutation.mutate(file);
          }
        }}
      />
    </div>
  );
}

function ActionTile({
  label,
  icon: Icon,
  testId,
  onClick,
  busy,
  asChild,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  onClick?: () => void;
  busy?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}) {
  const className = cn(
    "flex h-18 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50",
    "min-h-[72px] px-2 text-center",
    busy && "opacity-70",
  );
  if (asChild && children) {
    return (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cn(className, "cursor-pointer")}
      data-testid={testId}
      onClick={onClick}
      disabled={busy}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function NestedView({
  view,
  asset,
  onBack,
  onAssetUpdated,
  testIdPrefix,
}: {
  view: Exclude<View, "grid">;
  asset: AssetDetail;
  onBack: () => void;
  onAssetUpdated: (asset: AssetDetail) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          data-testid={`${testIdPrefix}-nested-back`}
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <div className="text-sm font-medium">{viewTitle(view)}</div>
      </div>
      {view === "status" ? (
        <StatusView
          asset={asset}
          onDone={(updated) => {
            onAssetUpdated(updated);
            onBack();
          }}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
      {view === "move" ? (
        <MoveView
          asset={asset}
          onDone={(updated) => {
            onAssetUpdated(updated);
            onBack();
          }}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
      {view === "note" ? (
        <NoteView
          asset={asset}
          onDone={(updated) => {
            onAssetUpdated(updated);
            onBack();
          }}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
      {view === "service" ? (
        <LogServiceView
          asset={asset}
          onDone={onBack}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
    </div>
  );
}

function StatusView({
  asset,
  onDone,
  testIdPrefix,
}: {
  asset: AssetDetail;
  onDone: (updated: AssetDetail) => void;
  testIdPrefix: string;
}) {
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<AssetStatus | null>(null);

  const mutation = useMutation({
    mutationFn: async (status: AssetStatus) => {
      await updateAssetStatus(asset.id, status);
      return status;
    },
    onMutate: (status) => {
      setPendingStatus(status);
    },
    onSuccess: (status) => {
      toast.success("Status updated");
      onDone({ ...asset, status });
      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", asset.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: () => {
      toast.error("Couldn't change status. Try again.");
      setPendingStatus(null);
    },
  });

  return (
    <ul
      className="flex flex-col gap-1"
      data-testid={`${testIdPrefix}-status-list`}
    >
      {ASSET_STATUS_OPTIONS.map((option) => {
        const active = asset.status === option;
        const busy = pendingStatus === option && mutation.isPending;
        return (
          <li key={option}>
            <button
              type="button"
              disabled={active || mutation.isPending}
              data-testid={`${testIdPrefix}-status-option-${option}`}
              className={cn(
                "flex h-11 w-full items-center justify-between rounded-md border border-border px-3 text-sm",
                active
                  ? "border-primary/50 bg-primary/5 font-medium"
                  : "bg-card hover:bg-accent",
                busy && "opacity-70",
              )}
              onClick={() => mutation.mutate(option)}
            >
              <span>{ASSET_STATUS_LABELS[option]}</span>
              {active ? (
                <span className="text-xs text-muted-foreground">Current</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MoveView({
  asset,
  onDone,
  testIdPrefix,
}: {
  asset: AssetDetail;
  onDone: (updated: AssetDetail) => void;
  testIdPrefix: string;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const { data: locations = [], isPending } = useQuery({
    queryKey: ["locations", "list"],
    queryFn: listLocations,
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(needle) ||
        loc.path.toLowerCase().includes(needle),
    );
  }, [locations, query]);

  const mutation = useMutation({
    mutationFn: async (target: Location | null) => {
      await updateAsset(asset.id, {
        locationId: target?.id ?? null,
      });
      return target;
    },
    onSuccess: (target) => {
      toast.success(target ? `Moved to ${target.path}` : "Cleared location");
      onDone({ ...asset, locationId: target?.id ?? null });
      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", asset.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
    onError: () => {
      toast.error("Couldn't move asset. Try again.");
    },
  });

  return (
    <div
      className="flex flex-col gap-2"
      data-testid={`${testIdPrefix}-move-view`}
    >
      <Input
        placeholder="Search locations…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        data-testid={`${testIdPrefix}-move-search`}
      />
      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading locations…</p>
      ) : null}
      <ul className="max-h-64 overflow-auto rounded-md border border-border">
        <li>
          <button
            type="button"
            disabled={mutation.isPending}
            data-testid={`${testIdPrefix}-move-option-none`}
            className="flex w-full items-center justify-between border-b border-border px-3 py-3 text-left text-sm hover:bg-accent disabled:opacity-60"
            onClick={() => mutation.mutate(null)}
          >
            <span>No location</span>
            {!asset.locationId ? (
              <span className="text-xs text-muted-foreground">Current</span>
            ) : null}
          </button>
        </li>
        {filtered.map((loc) => {
          const active = asset.locationId === loc.id;
          return (
            <li key={loc.id}>
              <button
                type="button"
                disabled={active || mutation.isPending}
                data-testid={`${testIdPrefix}-move-option-${loc.id}`}
                className={cn(
                  "flex w-full flex-col items-start border-b border-border px-3 py-3 text-left text-sm last:border-b-0",
                  active
                    ? "bg-primary/5 font-medium"
                    : "bg-card hover:bg-accent",
                )}
                onClick={() => mutation.mutate(loc)}
              >
                <span>{loc.name}</span>
                <span className="text-xs text-muted-foreground">
                  {loc.path}
                </span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && !isPending ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            No matches
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function NoteView({
  asset,
  onDone,
  testIdPrefix,
}: {
  asset: AssetDetail;
  onDone: (updated: AssetDetail) => void;
  testIdPrefix: string;
}) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [value, setValue] = useState("");

  const mutation = useMutation({
    mutationFn: async (note: string) => {
      const prefix = buildNotePrefix(currentUser?.name);
      const line = `${prefix} ${note.trim()}`;
      const nextNotes = asset.notes ? `${asset.notes}\n${line}` : line;
      await updateAsset(asset.id, { notes: nextNotes });
      return nextNotes;
    },
    onSuccess: (nextNotes) => {
      toast.success("Note saved");
      onDone({ ...asset, notes: nextNotes });
      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", asset.id],
      });
    },
    onError: () => {
      toast.error("Couldn't save note. Try again.");
    },
  });

  return (
    <form
      data-testid={`${testIdPrefix}-note-form`}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        mutation.mutate(value);
      }}
    >
      <Textarea
        rows={4}
        placeholder="Noticed something — a scratch, missing part, calibration due…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        data-testid={`${testIdPrefix}-note-input`}
      />
      <Button
        type="submit"
        className="cursor-pointer"
        disabled={!value.trim() || mutation.isPending}
        data-testid={`${testIdPrefix}-note-submit`}
      >
        {mutation.isPending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}

function LogServiceView({
  asset,
  onDone,
  testIdPrefix,
}: {
  asset: AssetDetail;
  onDone: () => void;
  testIdPrefix: string;
}) {
  const queryClient = useQueryClient();
  const [serviceDate, setServiceDate] = useState(() => todayIso());
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [providerId, setProviderId] = useState<string | "">("");

  const providersQuery = useQuery({
    queryKey: ["service-providers", "options"],
    queryFn: listServiceProviderOptions,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        assetId: asset.id,
        serviceDate,
        description: description.trim(),
        cost: cost.trim() === "" ? null : Number(cost),
        providerId: providerId === "" ? null : providerId,
        values: {} as Record<string, ServiceRecordValue>,
      };
      return createServiceRecord(input);
    },
    onSuccess: () => {
      toast.success("Service logged");
      onDone();
      void queryClient.invalidateQueries({
        queryKey: ["service-records", "asset", asset.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["service-schedules"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      toast.error(
        "Couldn't log service. Open the asset page if extra fields are required.",
      );
    },
  });

  return (
    <form
      data-testid={`${testIdPrefix}-service-form`}
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!description.trim()) return;
        mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-muted-foreground">Service date</span>
        <Input
          type="date"
          value={serviceDate}
          onChange={(event) => setServiceDate(event.target.value)}
          required
          data-testid={`${testIdPrefix}-service-date`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-muted-foreground">What was done</span>
        <Textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Replaced belt, topped up oil, …"
          required
          data-testid={`${testIdPrefix}-service-description`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-muted-foreground">
          Cost <span className="opacity-60">(optional)</span>
        </span>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
          data-testid={`${testIdPrefix}-service-cost`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-muted-foreground">
          Provider <span className="opacity-60">(optional)</span>
        </span>
        <select
          value={providerId}
          onChange={(event) => setProviderId(event.target.value)}
          data-testid={`${testIdPrefix}-service-provider`}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">No provider</option>
          {providersQuery.data?.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        className="cursor-pointer"
        disabled={!description.trim() || mutation.isPending}
        data-testid={`${testIdPrefix}-service-submit`}
      >
        {mutation.isPending ? "Saving…" : "Log service"}
      </Button>
    </form>
  );
}

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildNotePrefix(userName: string | null | undefined): string {
  const datePart = todayIso();
  const name = userName?.trim() || "Someone";
  return `[${datePart}] ${name}:`;
}

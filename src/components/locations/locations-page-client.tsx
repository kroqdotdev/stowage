"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { AssetListItem } from "@/components/assets/types";
import { AssetCardList } from "@/components/assets/asset-card-list";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { ApiRequestError } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { MobileTitleCount } from "@/components/layout/mobile-top-bar";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { LocationPicker } from "@/components/locations/location-picker";
import {
  buildLocationChildrenMap,
  collectDescendantIds,
  type LocationTreeItem,
} from "@/components/locations/location-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { SheetFoot, SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatStrip } from "@/components/ui/stat-strip";
import { StatusText } from "@/components/ui/status-text";
import { TagChip } from "@/components/ui/tag-chip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getAppSettings } from "@/lib/api/app-settings";
import { listAssets } from "@/lib/api/assets";
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "@/lib/api/locations";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import { getDaysUntil } from "@/lib/date-format";
import { formatRelativeTime } from "@/lib/relative-time";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";
import { cn } from "@/lib/utils";

const LOCATIONS_QUERY_KEY = ["locations"] as const;
const SHEET_LIMIT = 50;
const INDENT = 24;

type FormState = { name: string; parentId: string | null; description: string };
const EMPTY_FORM: FormState = { name: "", parentId: null, description: "" };

type FlatRow = {
  location: LocationTreeItem;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
};

function splitPath(path: string) {
  const parts = path.split(" / ");
  const leaf = parts.pop() ?? path;
  return { ancestors: parts.join(" / "), leaf };
}

/*
  Locations: the tree on a card (counts roll up; the current row carries the
  amber-ink mark), the empty locations under it, then the selected location as
  a card with its stat strip and its assets as a sheet. On a phone the tree
  becomes one location picker at the top.
*/
export function LocationsPageClient() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const today = useTodayIsoDate();
  const { data: currentUser } = useCurrentUser();
  const canManage = currentUser?.role === "admin";

  const locationsQuery = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });
  const assetsQuery = useQuery({
    queryKey: [
      "assets",
      "list",
      { sortBy: "updatedAt", sortDirection: "desc" },
    ],
    queryFn: () => listAssets({ sortBy: "updatedAt", sortDirection: "desc" }),
  });
  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60_000,
  });
  const schedulingEnabled =
    settingsQuery.data?.serviceSchedulingEnabled ?? false;
  const scheduledQuery = useQuery({
    queryKey: ["service-schedules", "scheduled"],
    queryFn: listScheduledAssets,
    enabled: schedulingEnabled,
  });

  const rows = useMemo(
    () =>
      ((hydrated ? locationsQuery.data : undefined) ??
        []) as LocationTreeItem[],
    [hydrated, locationsQuery.data],
  );
  const assets = useMemo(
    () => ((hydrated ? assetsQuery.data : undefined) ?? []) as AssetListItem[],
    [hydrated, assetsQuery.data],
  );
  const loading =
    !hydrated || locationsQuery.isPending || assetsQuery.isPending;

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const childrenByParent = useMemo(
    () => buildLocationChildrenMap(rows),
    [rows],
  );
  const roots = useMemo(
    () => childrenByParent.get(null) ?? [],
    [childrenByParent],
  );

  const assetsByLocation = useMemo(() => {
    const map = new Map<string, AssetListItem[]>();
    for (const asset of assets) {
      if (!asset.locationId) continue;
      const list = map.get(asset.locationId);
      if (list) list.push(asset);
      else map.set(asset.locationId, [asset]);
    }
    return map;
  }, [assets]);

  // Rolled-up asset counts: a location counts everything inside it.
  const totals = useMemo(() => {
    const result = new Map<string, number>();
    function visit(location: LocationTreeItem, seen: Set<string>): number {
      if (seen.has(location.id)) return 0;
      seen.add(location.id);
      let sum = assetsByLocation.get(location.id)?.length ?? 0;
      for (const child of childrenByParent.get(location.id) ?? []) {
        sum += visit(child, seen);
      }
      result.set(location.id, sum);
      return sum;
    }
    for (const root of roots) visit(root, new Set());
    return result;
  }, [assetsByLocation, childrenByParent, roots]);

  const emptyLocations = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (totals.get(row.id) ?? 0) === 0 &&
            (childrenByParent.get(row.id) ?? []).length === 0,
        )
        .sort((a, b) =>
          a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
        ),
    [rows, totals, childrenByParent],
  );

  // Selection follows ?location=, defaulting to the first site.
  const paramId = searchParams.get("location");
  const selectedId =
    paramId && rowsById.has(paramId) ? paramId : (roots[0]?.id ?? null);
  const selected = selectedId ? (rowsById.get(selectedId) ?? null) : null;

  // expandedIds is null until the user first opens or closes a row.
  // revealedFor is the selection those choices were made under: when the
  // selection moves on (a tree click, the empty list, a new location, a
  // link), its ancestors open again so the current row is always visible.
  const [expansion, setExpansion] = useState<{
    ids: Set<string> | null;
    revealedFor: string | null;
  }>({ ids: null, revealedFor: null });
  const [query, setQuery] = useState("");

  const effectiveExpanded = useMemo(() => {
    const path = new Set<string>();
    let cursor = selected?.parentId ?? null;
    while (cursor && !path.has(cursor)) {
      path.add(cursor);
      cursor = rowsById.get(cursor)?.parentId ?? null;
    }
    if (!expansion.ids) {
      if (selected && (childrenByParent.get(selected.id) ?? []).length > 0) {
        path.add(selected.id);
      }
      return path;
    }
    if (expansion.revealedFor === selectedId) return expansion.ids;
    return new Set([...expansion.ids, ...path]);
  }, [expansion, selected, selectedId, rowsById, childrenByParent]);

  function setExpandedIds(ids: Set<string>) {
    setExpansion({ ids, revealedFor: selectedId });
  }

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", id);
    params.delete("new");
    router.replace(`/locations?${params.toString()}`, { scroll: false });
  }

  function toggle(id: string) {
    const next = new Set(effectiveExpanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  }

  const flatRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = new Set<string>();
    if (needle) {
      for (const row of rows) {
        if (row.name.toLowerCase().includes(needle)) {
          let cursor: string | null = row.id;
          while (cursor && !matches.has(cursor)) {
            matches.add(cursor);
            cursor = rowsById.get(cursor)?.parentId ?? null;
          }
        }
      }
    }
    const out: FlatRow[] = [];
    function walk(nodes: LocationTreeItem[], depth: number, seen: Set<string>) {
      for (const node of nodes) {
        if (seen.has(node.id)) continue;
        if (needle && !matches.has(node.id)) continue;
        const children = childrenByParent.get(node.id) ?? [];
        const expanded = needle ? true : effectiveExpanded.has(node.id);
        out.push({
          location: node,
          depth,
          hasChildren: children.length > 0,
          expanded,
        });
        if (expanded) walk(children, depth + 1, new Set([...seen, node.id]));
      }
    }
    walk(roots, 0, new Set());
    return out;
  }, [query, rows, rowsById, childrenByParent, roots, effectiveExpanded]);

  // The selected location's assets, its sub-locations included.
  const subtreeIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const ids = collectDescendantIds(selected.id, childrenByParent);
    ids.add(selected.id);
    return ids;
  }, [selected, childrenByParent]);
  const subtreeAssets = useMemo(
    () =>
      assets.filter(
        (asset) => asset.locationId && subtreeIds.has(asset.locationId),
      ),
    [assets, subtreeIds],
  );
  const overdueCount = useMemo(() => {
    if (!schedulingEnabled) return 0;
    const ids = new Set(subtreeAssets.map((asset) => asset.id));
    return (scheduledQuery.data ?? []).filter(
      (item) =>
        ids.has(item.assetId) && getDaysUntil(item.nextServiceDate, today) < 0,
    ).length;
  }, [schedulingEnabled, subtreeAssets, scheduledQuery.data, today]);

  // ---- mutations -------------------------------------------------------
  const [formOpen, setFormOpen] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showAllFor, setShowAllFor] = useState<string | null>(null);

  // The phone top bar's + opens "New location…" with ?new=1.
  const wantsNew = searchParams.get("new") === "1" && canManage;
  const dialogMode = formOpen ?? (wantsNew ? "create" : null);

  // Only admins add locations; anyone else who lands on ?new=1 is told so
  // and the param is dropped instead of silently doing nothing.
  const deniedNew =
    searchParams.get("new") === "1" && Boolean(currentUser) && !canManage;
  useEffect(() => {
    if (!deniedNew) return;
    toast.info("Only admins can add locations.");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    router.replace(`/locations${params.size ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }, [deniedNew, searchParams, router]);

  function closeForm() {
    setFormOpen(null);
    setForm(EMPTY_FORM);
    if (searchParams.get("new")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(
        `/locations${params.size ? `?${params.toString()}` : ""}`,
        { scroll: false },
      );
    }
  }

  const createM = useMutation({
    mutationFn: createLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });
  const updateM = useMutation({
    mutationFn: (vars: {
      id: string;
      input: Parameters<typeof updateLocation>[1];
    }) => updateLocation(vars.id, vars.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
  const deleteM = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });

  function openCreate(parentId: string | null) {
    setForm({ ...EMPTY_FORM, parentId });
    setFormOpen("create");
  }

  function openEdit() {
    if (!selected) return;
    setForm({
      name: selected.name,
      parentId: selected.parentId,
      description: selected.description ?? "",
    });
    setFormOpen("edit");
  }

  async function handleSubmit(values: {
    name: string;
    parentId: string | null;
    description: string | null;
  }) {
    if (!values.name.trim()) {
      toast.error("Enter a location name");
      return;
    }
    try {
      if (dialogMode === "edit" && selected) {
        await updateM.mutateAsync({ id: selected.id, input: values });
        toast.success("Location saved");
      } else {
        const created = await createM.mutateAsync(values);
        toast.success("Location created");
        select(created.id);
      }
      setFormOpen(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          dialogMode === "edit"
            ? "Unable to save location"
            : "Unable to create location",
        ),
      );
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteM.mutateAsync(selected.id);
      toast.success("Location deleted");
      setDeleteOpen(false);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("location");
      router.replace(
        `/locations${params.size ? `?${params.toString()}` : ""}`,
        { scroll: false },
      );
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError && error.status === 409
          ? "This location still holds assets or sub-locations. Move them out first."
          : getApiErrorMessage(error, "Unable to delete location"),
      );
    }
  }

  const editExclusions = useMemo(() => {
    if (dialogMode !== "edit" || !selected) return undefined;
    const ids = collectDescendantIds(selected.id, childrenByParent);
    ids.add(selected.id);
    return ids;
  }, [dialogMode, selected, childrenByParent]);

  // ---- render ----------------------------------------------------------
  const newLocationButton = canManage ? (
    <Button type="button" onClick={() => openCreate(null)}>
      <Plus />
      New location…
    </Button>
  ) : null;

  const placedCount = assets.filter(
    (asset) => asset.locationId && rowsById.has(asset.locationId),
  ).length;
  const subline = loading
    ? " "
    : `${placedCount} ${placedCount === 1 ? "asset" : "assets"} across ${roots.length} ${roots.length === 1 ? "site" : "sites"}`;

  const dialogs = (
    <>
      <LocationFormDialog
        open={dialogMode !== null}
        mode={dialogMode ?? "create"}
        locations={rows}
        excludeParentIds={editExclusions}
        values={form}
        submitting={createM.isPending || updateM.isPending}
        onClose={closeForm}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete location?"
        description={
          selected
            ? `${selected.path} is deleted. It holds no assets or sub-locations, so nothing else changes.`
            : "This location is deleted."
        }
        confirmLabel="Delete location"
        busy={deleteM.isPending}
        onClose={() => {
          if (!deleteM.isPending) setDeleteOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );

  if (!loading && rows.length === 0) {
    return (
      <div data-testid="locations-page">
        <PageHeader
          title="Locations"
          className="max-md:hidden"
          actions={newLocationButton}
        />
        <EmptyState
          icon={MapPin}
          title="No locations yet."
          description="Add your sites first, then the rooms, benches and shelves inside them."
          action={newLocationButton}
        />
        {dialogs}
      </div>
    );
  }

  const selectedChildren = selected
    ? (childrenByParent.get(selected.id) ?? [])
    : [];
  const parent = selected?.parentId ? rowsById.get(selected.parentId) : null;
  const directAssetCount = selected
    ? (assetsByLocation.get(selected.id)?.length ?? 0)
    : 0;
  const deleteBlockedReason =
    selectedChildren.length > 0 || directAssetCount > 0
      ? `Move out its ${[
          directAssetCount > 0
            ? `${directAssetCount} ${directAssetCount === 1 ? "asset" : "assets"}`
            : null,
          selectedChildren.length > 0
            ? `${selectedChildren.length} ${selectedChildren.length === 1 ? "sub-location" : "sub-locations"}`
            : null,
        ]
          .filter(Boolean)
          .join(" and ")} first`
      : null;
  const showAll = showAllFor !== null && showAllFor === selectedId;
  const shownAssets = showAll
    ? subtreeAssets
    : subtreeAssets.slice(0, SHEET_LIMIT);

  const detailCard = selected ? (
    <Panel className="overflow-hidden" data-testid="location-detail">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 pt-4 pb-4 md:px-5">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="wide text-2xl leading-tight font-bold text-foreground">
            {selected.name}
            {parent ? " " : null}
            {parent ? (
              <span className="ml-1 text-lg font-normal tracking-normal text-ink-2 [font-stretch:100%]">
                in {parent.name}
              </span>
            ) : null}
          </h2>
          {selected.description ? (
            <p className="mt-1 max-w-[60ch] text-sm text-ink-2">
              {selected.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/assets/new?location=${selected.id}`}>
              <Plus />
              Add asset here…
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Location actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {subtreeAssets.length > 0 ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/labels/print?assetIds=${subtreeAssets.map((asset) => asset.id).join(",")}`}
                  >
                    <Printer />
                    Print labels…
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canManage ? (
                <>
                  <DropdownMenuItem onSelect={() => openCreate(selected.id)}>
                    <Plus />
                    New location inside…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={openEdit}>
                    <Pencil />
                    Edit…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {deleteBlockedReason ? (
                    <DropdownMenuItem disabled className="items-start">
                      <Trash2 className="mt-0.5" />
                      <span>
                        Delete…
                        <span className="block text-[13px] text-muted-foreground">
                          {deleteBlockedReason}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteOpen(true)}
                    >
                      <Trash2 />
                      Delete…
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <StatStrip
        className="rounded-none border-0 border-t border-border"
        items={[
          { key: "assets", label: "Assets", value: subtreeAssets.length },
          {
            key: "overdue",
            label: "Overdue",
            value: overdueCount,
            tone: "danger",
            href: overdueCount > 0 ? "/services" : undefined,
          },
          {
            key: "under_repair",
            label: "Under repair",
            shortLabel: "In repair",
            value: subtreeAssets.filter(
              (asset) => asset.status === "under_repair",
            ).length,
            tone: "repair",
          },
          {
            key: "in_storage",
            label: "In storage",
            shortLabel: "Stored",
            value: subtreeAssets.filter(
              (asset) => asset.status === "in_storage",
            ).length,
            tone: "slate",
          },
          {
            key: "inside",
            label: "Sub-locations",
            value: selectedChildren.length,
          },
        ]}
      />
    </Panel>
  ) : null;

  const assetsSheet = selected ? (
    <section>
      <SheetHeading
        title={`Assets at ${selected.name}`}
        count={subtreeAssets.length}
        aside={
          selectedChildren.length === 0 && subtreeAssets.length > 0 ? (
            <Link href={`/assets?location=${selected.id}`}>Open in Assets</Link>
          ) : null
        }
      />
      {subtreeAssets.length === 0 ? (
        <p className="px-0.5 py-4 text-sm text-ink-2">
          Nothing here yet.{" "}
          <Link
            href={`/assets/new?location=${selected.id}`}
            className="font-medium text-foreground underline underline-offset-[3px]"
          >
            Add an asset here…
          </Link>
        </p>
      ) : isPhone ? (
        <AssetCardList
          rows={shownAssets}
          loading={false}
          secondary="category"
        />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="h-10 border-b border-border px-0.5 text-left text-[13px] font-semibold">
                Tag
              </th>
              <th className="h-10 border-b border-border px-3 text-left text-[13px] font-semibold">
                Name
              </th>
              <th className="hidden h-10 border-b border-border px-3 text-left text-[13px] font-semibold lg:table-cell">
                Category
              </th>
              <th className="h-10 border-b border-border pl-[30px] text-left text-[13px] font-semibold">
                Status
              </th>
              <th className="h-10 border-b border-border pr-0.5 text-right text-[13px] font-semibold">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {shownAssets.map((asset) => {
              const time = formatRelativeTime(asset.updatedAt);
              const nested =
                asset.locationId !== selected.id && asset.locationPath
                  ? asset.locationPath.slice(selected.path.length + 3)
                  : null;
              return (
                <tr
                  key={asset.id}
                  className="cursor-pointer border-b border-border hover:bg-card/60"
                  onClick={() => router.push(`/assets/${asset.id}`)}
                >
                  <td className="w-[1%] py-2.5 pr-3 pl-0.5">
                    <TagChip weight="table">{asset.assetTag}</TagChip>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/assets/${asset.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium text-foreground hover:underline hover:underline-offset-[3px]"
                    >
                      {asset.name}
                    </Link>
                    {nested ? (
                      <span className="block text-[13px] text-ink-2">
                        in {nested}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-3 whitespace-nowrap text-foreground lg:table-cell">
                    {asset.categoryName ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 whitespace-nowrap">
                    <StatusText
                      status={asset.status}
                      inTable
                      className="max-lg:text-[13px]"
                    />
                  </td>
                  <td className="pr-0.5 pl-3 text-right whitespace-nowrap text-ink-2">
                    <span className="hidden lg:inline">{time.long}</span>
                    <span className="lg:hidden">{time.short}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {subtreeAssets.length > SHEET_LIMIT ? (
        <SheetFoot>
          {showAll ? (
            <>All {subtreeAssets.length}, most recently updated first.</>
          ) : (
            <>
              Showing the {SHEET_LIMIT} most recently updated of{" "}
              {subtreeAssets.length}.{" "}
              <button
                type="button"
                onClick={() => setShowAllFor(selectedId)}
                className="cursor-pointer font-medium text-foreground underline underline-offset-[3px]"
              >
                Show all {subtreeAssets.length}
              </button>
            </>
          )}
        </SheetFoot>
      ) : null}
    </section>
  ) : null;

  return (
    <div data-testid="locations-page">
      <PageHeader
        title="Locations"
        count={loading ? undefined : rows.length}
        description={subline}
        className="max-md:hidden"
        actions={newLocationButton}
      />
      {loading ? null : <MobileTitleCount count={rows.length} />}

      {isPhone ? (
        <div className="space-y-6">
          <LocationPicker
            value={selectedId}
            options={rows}
            onChange={(id) => (id ? select(id) : null)}
            nullLabel="Choose a location"
            compact
            trigger={
              <button
                type="button"
                aria-label={`Location: ${selected?.path ?? "none"}. Change location`}
                className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-md border-[1.5px] border-input bg-card px-3.5 text-left"
              >
                <span className="eyebrow">Location</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                  {selected ? (
                    <>
                      {splitPath(selected.path).ancestors
                        ? `${splitPath(selected.path).ancestors} / `
                        : null}
                      <b className="font-semibold text-foreground">
                        {selected.name}
                      </b>
                    </>
                  ) : (
                    "Choose a location"
                  )}
                </span>
                <ChevronDown className="size-4 shrink-0 text-ink-2" />
              </button>
            }
          />
          {loading ? <Skeleton className="h-40 rounded-md" /> : detailCard}
          {loading ? null : assetsSheet}
        </div>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-7">
          <Panel className="overflow-hidden" data-testid="location-tree">
            <div className="flex items-center gap-3 border-b border-border p-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a location"
                  aria-label="Find a location"
                  className="pl-9"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpandedIds(
                    effectiveExpanded.size > 0
                      ? new Set()
                      : new Set(rows.map((row) => row.id)),
                  )
                }
                className="shrink-0 cursor-pointer text-sm font-medium text-ink-2 underline underline-offset-[3px] hover:text-foreground max-lg:hidden"
              >
                {effectiveExpanded.size > 0 ? "Collapse all" : "Expand all"}
              </button>
            </div>

            {loading ? (
              <div className="space-y-4 p-4">
                {[70, 50, 60, 45].map((width) => (
                  <Skeleton
                    key={width}
                    className="h-2.5"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </div>
            ) : flatRows.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-2">
                No location matches “{query.trim()}”.
              </p>
            ) : (
              <ul className="py-1.5" aria-label="Location tree">
                {flatRows.map(({ location, depth, hasChildren, expanded }) => {
                  const current = location.id === selectedId;
                  return (
                    <li
                      key={location.id}
                      className={cn(
                        "relative flex h-[38px] items-center pr-3",
                        current
                          ? "bg-secondary shadow-[inset_3px_0_0_var(--amber-ink)]"
                          : "hover:bg-secondary/60",
                      )}
                      style={{ paddingLeft: 10 + depth * INDENT }}
                    >
                      {Array.from({ length: depth }).map((_, level) => (
                        <span
                          key={level}
                          aria-hidden="true"
                          className="absolute inset-y-0 w-px bg-line-2"
                          style={{ left: 10 + level * INDENT + 11 }}
                        />
                      ))}
                      {hasChildren ? (
                        <button
                          type="button"
                          aria-label={`${expanded ? "Collapse" : "Expand"} ${location.name}`}
                          aria-expanded={expanded}
                          onClick={() => toggle(location.id)}
                          disabled={Boolean(query.trim())}
                          className="relative z-10 grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-xs text-ink-2 hover:text-foreground disabled:cursor-default"
                        >
                          {expanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="size-[22px] shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => select(location.id)}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 pl-1.5 text-left text-sm",
                          depth === 0 ? "font-semibold" : "font-medium",
                          current
                            ? "text-foreground"
                            : "text-ink-2 hover:text-foreground",
                          depth === 0 && !current && "text-foreground",
                        )}
                      >
                        <span className="truncate">{location.name}</span>
                        <span className="ml-auto font-mono text-[13px] font-medium text-muted-foreground">
                          {totals.get(location.id) ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loading && emptyLocations.length > 0 && !query.trim() ? (
              <div className="border-t-2 border-foreground px-3.5 pt-3.5 pb-2">
                <h3 className="eyebrow mb-1.5">Empty locations</h3>
                <ul>
                  {emptyLocations.map((location) => {
                    const { ancestors, leaf } = splitPath(location.path);
                    return (
                      <li
                        key={location.id}
                        className="flex min-h-[34px] items-center gap-2"
                      >
                        <MapPin
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => select(location.id)}
                          className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm text-ink-2 hover:underline hover:underline-offset-[3px]"
                        >
                          {ancestors ? `${ancestors} / ` : null}
                          <b className="font-medium text-foreground">{leaf}</b>
                        </button>
                        <Link
                          href={`/assets/new?location=${location.id}`}
                          aria-label={`Add asset to ${location.path}`}
                          className="grid size-7 shrink-0 place-items-center rounded-xs border-[1.5px] border-input bg-card text-foreground hover:border-foreground"
                        >
                          <Plus className="size-3.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {loading ? null : (
              <div className="border-t border-border px-3.5 py-3 text-[13px] text-muted-foreground">
                {rows.length} {rows.length === 1 ? "location" : "locations"}
                {emptyLocations.length > 0
                  ? ` · ${emptyLocations.length} empty`
                  : null}
              </div>
            )}
          </Panel>

          <div className="min-w-0 space-y-7">
            {loading ? <Skeleton className="h-44 rounded-md" /> : detailCard}
            {loading ? null : assetsSheet}
          </div>
        </div>
      )}

      {dialogs}
    </div>
  );
}

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { CrudModal } from "@/components/crud/modal";
import { ReleaseNotes } from "@/components/settings/release-notes";
import { Button } from "@/components/ui/button";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { ApiRequestError } from "@/lib/api-client";
import {
  applyUpdate,
  getHealth,
  getUpdates,
  type Release,
  type UpdaterStatus,
  type UpdatesView,
} from "@/lib/api/updates";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { formatRelativeTime } from "@/lib/relative-time";
import { useAppDateFormat } from "@/lib/use-app-date-format";
import { cn } from "@/lib/utils";

/*
  Settings > Updates: what is installed, what is published, and the way to
  move between them. With the updater sidecar running, admins update in
  place and this page reloads when the new version answers. Without it, the
  section shows the compose commands instead.
*/

const POLL_MS = 2000;
const LOG_TAIL = 12;
const PREVIEW_RELEASES = 3;
// After this long without a verdict the controls come back and the copy
// says what to check, rather than spinning forever.
const SLOW_UPDATE_MS = 10 * 60 * 1000;

type Tracking = { from: string; target: string; startedAt: number };

type Phase = "idle" | "updating" | "restarting" | "succeeded" | "failed";

function mapError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return "Only admins can update Stowage.";
    return error.message || fallback;
  }
  return fallback;
}

function runStatusOf(data: UpdatesView | undefined): UpdaterStatus | null {
  const updater = data?.updater;
  if (!updater || !updater.configured || !updater.reachable) return null;
  return updater.status;
}

function manualCommands(version: string) {
  return [
    "cd /path/to/stowage   # the folder with docker-compose.release.yml",
    `STOWAGE_VERSION=${version} docker compose -f docker-compose.release.yml pull`,
    `STOWAGE_VERSION=${version} docker compose -f docker-compose.release.yml up -d`,
  ].join("\n");
}

export function UpdatesSection() {
  const queryClient = useQueryClient();
  const dateFormat = useAppDateFormat();
  const [tracking, setTracking] = React.useState<Tracking | null>(null);
  const [confirmVersion, setConfirmVersion] = React.useState<string | null>(
    null,
  );
  const [checking, setChecking] = React.useState(false);
  const [showAllReleases, setShowAllReleases] = React.useState(false);

  const updatesQuery = useQuery({
    queryKey: ["updates"],
    queryFn: () => getUpdates(),
    retry: false,
    staleTime: 60_000,
    refetchInterval: tracking ? POLL_MS : false,
  });
  const data = updatesQuery.data;
  const runStatus = runStatusOf(data);

  // Someone (us, or another admin) started an update: follow it.
  React.useEffect(() => {
    if (tracking || !data || runStatus?.state !== "running") return;
    setTracking({
      from: data.current.version,
      target: runStatus.targetVersion ?? "",
      startedAt: runStatus.startedAt ?? Date.now(),
    });
  }, [data, runStatus, tracking]);

  // While an update runs, watch the unauthenticated health endpoint. The
  // moment it answers with another version, the new build is serving.
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    enabled: tracking !== null,
    retry: false,
    refetchInterval: tracking ? POLL_MS : false,
  });
  React.useEffect(() => {
    if (!tracking) return;
    const version = healthQuery.data?.version;
    if (version && version !== tracking.from) {
      window.location.reload();
    }
  }, [healthQuery.data, tracking]);

  const applyMutation = useMutation({
    mutationFn: (version: string) => applyUpdate(version),
    onSuccess: (status, version) => {
      setConfirmVersion(null);
      setTracking({
        from: data?.current.version ?? "",
        target: version,
        startedAt: status.startedAt ?? Date.now(),
      });
      queryClient.setQueryData<UpdatesView>(["updates"], (previous) =>
        previous
          ? {
              ...previous,
              updater: { configured: true, reachable: true, status },
            }
          : previous,
      );
    },
    onError: (error) => {
      toast.error(mapError(error, "Unable to start the update"));
      // A timeout or "already running" may mean the run did start; the
      // refetch lets the tracking effect above pick it up.
      void queryClient.invalidateQueries({ queryKey: ["updates"] });
    },
  });

  const checkNow = async () => {
    setChecking(true);
    try {
      const before = data?.checkedAt ?? null;
      const fresh = await getUpdates({ refresh: true });
      queryClient.setQueryData(["updates"], fresh);
      if (fresh.checkError) toast.error(fresh.checkError);
      else if (fresh.checkWarning) toast.error(fresh.checkWarning);
      else if (fresh.checkedAt === before)
        toast.message("Checked less than a minute ago");
      else if (!fresh.updateAvailable) toast.success("Stowage is up to date");
    } catch (error) {
      toast.error(mapError(error, "Unable to check for updates"));
    } finally {
      setChecking(false);
    }
  };

  let phase: Phase = "idle";
  if (tracking) {
    if (runStatus?.state === "failed") phase = "failed";
    else if (runStatus?.state === "succeeded") phase = "succeeded";
    else if (updatesQuery.isError) phase = "restarting";
    else phase = "updating";
  }

  const updater = data?.updater;
  const canApply =
    updater?.configured === true && updater.reachable && phase === "idle";
  const latest = data?.latest ?? null;
  const newer = data?.newer ?? [];
  const visibleReleases = showAllReleases
    ? newer
    : newer.slice(0, PREVIEW_RELEASES);

  return (
    <section aria-labelledby="settings-updates-title">
      <SheetHeading
        title={<span id="settings-updates-title">Updates</span>}
        aside={
          data ? (
            <a
              href={`https://github.com/${data.repo}/releases`}
              target="_blank"
              rel="noreferrer"
            >
              All releases
            </a>
          ) : null
        }
      />

      {updatesQuery.isPending ? (
        <p className="py-4 text-sm text-muted-foreground">Loading...</p>
      ) : updatesQuery.isError && !data ? (
        <p className="py-4 text-sm text-ink-2">
          {mapError(updatesQuery.error, "Unable to load update information.")}
        </p>
      ) : data ? (
        <>
          <div className="flex items-start justify-between gap-6 border-b border-border px-0.5 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Stowage {data.current.version}
                {data.current.build ? (
                  <span className="ml-2 font-mono text-[12px] font-medium text-muted-foreground">
                    {data.current.build}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-sm text-ink-2">
                {data.checkError
                  ? data.checkError
                  : data.checkedAt
                    ? `Checked ${formatRelativeTime(data.checkedAt).long.toLowerCase()}`
                    : "Not checked yet"}
              </p>
              {data.checkWarning ? (
                <p className="mt-0.5 text-sm text-ink-2">{data.checkWarning}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => void checkNow()}
              disabled={checking || phase !== "idle"}
            >
              {checking ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              Check now
            </Button>
          </div>

          {!data.checkError ? (
            <div className="border-b border-border px-0.5 py-4">
              {latest ? (
                <>
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        <span
                          aria-hidden="true"
                          className="mr-2 inline-block size-[9px] translate-y-px bg-primary"
                        />
                        {latest.version} is available
                      </p>
                      <p className="mt-0.5 text-sm text-ink-2">
                        {latest.publishedAt
                          ? `Released ${formatDateFromTimestamp(latest.publishedAt, dateFormat)}. `
                          : ""}
                        {newer.length > 1
                          ? `${newer.length} releases since ${data.current.version}.`
                          : null}
                      </p>
                    </div>
                    {canApply ? (
                      <Button
                        type="button"
                        className="shrink-0"
                        onClick={() => setConfirmVersion(latest.version)}
                      >
                        Update to {latest.version}
                      </Button>
                    ) : null}
                  </div>

                  <ul className="mt-4 space-y-4" aria-label="What's new">
                    {visibleReleases.map((release) => (
                      <ReleaseItem
                        key={release.tag}
                        release={release}
                        dateFormat={dateFormat}
                      />
                    ))}
                  </ul>
                  {newer.length > PREVIEW_RELEASES && !showAllReleases ? (
                    <button
                      type="button"
                      className="mt-3 cursor-pointer text-[13px] font-medium text-ink-2 underline underline-offset-[3px] hover:text-foreground"
                      onClick={() => setShowAllReleases(true)}
                    >
                      Show all {newer.length} releases
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-ink-2">Stowage is up to date.</p>
              )}
            </div>
          ) : null}

          {phase !== "idle" ? (
            <UpdateProgress
              phase={phase}
              tracking={tracking}
              status={runStatus}
              onDismiss={() => setTracking(null)}
            />
          ) : null}

          {latest && !canApply && phase === "idle" ? (
            <ManualUpdate version={latest.version} updater={data.updater} />
          ) : null}
        </>
      ) : null}

      <CrudModal
        open={confirmVersion !== null}
        title={`Update to ${confirmVersion ?? ""}?`}
        description="Stowage pulls the new images and restarts its services."
        onClose={() => {
          if (!applyMutation.isPending) setConfirmVersion(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmVersion(null)}
              disabled={applyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (confirmVersion) applyMutation.mutate(confirmVersion);
              }}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Update now
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-ink-2">
          <p>
            The app is unavailable for a minute or so while the containers are
            recreated. This page reloads when the new version answers.
          </p>
          <p>
            Your data in <code className="font-mono text-[12px]">pb_data</code>{" "}
            is kept. Take a backup first if you have not recently.
          </p>
        </div>
      </CrudModal>
    </section>
  );
}

function ReleaseItem({
  release,
  dateFormat,
}: {
  release: Release;
  dateFormat: ReturnType<typeof useAppDateFormat>;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-4">
        <a
          href={release.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-foreground underline-offset-[3px] hover:underline"
        >
          {release.name}
        </a>
        {release.publishedAt ? (
          <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
            {formatDateFromTimestamp(release.publishedAt, dateFormat)}
          </span>
        ) : null}
      </div>
      <ReleaseNotes
        notes={release.notes}
        className="mt-1.5 space-y-1.5 text-sm text-ink-2"
      />
    </li>
  );
}

function UpdateProgress({
  phase,
  tracking,
  status,
  onDismiss,
}: {
  phase: Phase;
  tracking: Tracking | null;
  status: UpdaterStatus | null;
  onDismiss: () => void;
}) {
  const target = tracking?.target || status?.targetVersion || "";
  const log = status?.log.slice(-LOG_TAIL) ?? [];
  const busy = phase === "updating" || phase === "restarting";
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    if (!busy || !tracking) {
      setSlow(false);
      return;
    }
    const remaining = tracking.startedAt + SLOW_UPDATE_MS - Date.now();
    if (remaining <= 0) {
      setSlow(true);
      return;
    }
    const timer = setTimeout(() => setSlow(true), remaining);
    return () => clearTimeout(timer);
  }, [busy, tracking]);

  const title =
    phase === "failed"
      ? `Update to ${target} failed`
      : phase === "succeeded"
        ? `Updated to ${target}`
        : phase === "restarting"
          ? "Restarting Stowage…"
          : `Updating to ${target}…`;
  const detail =
    phase === "failed"
      ? (status?.error ??
        "The updater reported a failure. Check the log and the container logs on the host.")
      : phase === "succeeded"
        ? "Waiting for the new version to answer. Reload if this page does not refresh on its own."
        : slow
          ? "This is taking longer than expected. Check `docker compose ps` and the container logs on the host; reload once the app answers."
          : phase === "restarting"
            ? "The containers are being recreated. This page reloads when the app is back."
            : "Pulling images and recreating services. Keep this page open.";

  return (
    <div
      className="border-b border-border px-0.5 py-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p
            className={cn(
              "flex items-center gap-2 text-sm font-semibold text-foreground",
              phase === "failed" && "text-destructive",
            )}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {title}
          </p>
          <p className="mt-0.5 text-sm text-ink-2">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase === "succeeded" || slow ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          ) : null}
          <Button
            type="button"
            variant={phase === "failed" ? "secondary" : "ghost"}
            size="sm"
            onClick={onDismiss}
          >
            {busy ? "Stop following" : "Dismiss"}
          </Button>
        </div>
      </div>
      {log.length ? (
        <pre
          aria-label="Update log"
          className="mt-3 max-h-56 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink-2"
        >
          {log.join("\n")}
        </pre>
      ) : null}
    </div>
  );
}

function ManualUpdate({
  version,
  updater,
}: {
  version: string;
  updater: UpdatesView["updater"];
}) {
  const reason =
    updater.configured && !updater.reachable
      ? updater.reason
      : 'One-click updates need the updater service. Start the release stack with the "updater" profile and set STOWAGE_UPDATER_TOKEN to turn them on.';
  return (
    <div className="border-b border-border px-0.5 py-4">
      <p className="text-sm font-semibold text-foreground">Update by hand</p>
      <p className="mt-0.5 max-w-[60ch] text-sm text-ink-2">{reason}</p>
      <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[12px] leading-relaxed text-foreground">
        {manualCommands(version)}
      </pre>
      <p className="mt-2 text-[13px] text-muted-foreground">
        Add the profiles you started with, for example{" "}
        <code className="font-mono">--profile pocketbase</code>, or pin{" "}
        <code className="font-mono">STOWAGE_VERSION</code> in .env and run the
        same commands without the prefix.
      </p>
    </div>
  );
}

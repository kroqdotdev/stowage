import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { UpdatesView } from "@/lib/api/updates";

const { getUpdatesMock, applyUpdateMock, getHealthMock, toastMock } =
  vi.hoisted(() => ({
    getUpdatesMock: vi.fn(),
    applyUpdateMock: vi.fn(),
    getHealthMock: vi.fn(),
    toastMock: { error: vi.fn(), success: vi.fn() },
  }));

vi.mock("@/lib/api/updates", () => ({
  getUpdates: (...args: unknown[]) => getUpdatesMock(...args),
  applyUpdate: (...args: unknown[]) => applyUpdateMock(...args),
  getHealth: () => getHealthMock(),
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("sonner", () => ({ toast: toastMock }));

import { UpdatesSection } from "@/components/settings/updates-section";

const release = {
  version: "0.3.0",
  tag: "v0.3.0",
  name: "Stowage 0.3.0",
  publishedAt: Date.parse("2026-11-02T09:00:00Z"),
  url: "https://github.com/kroqdotdev/stowage/releases/tag/v0.3.0",
  notes: "## Added\n\n- In-app updates\n- A `thing`",
  prerelease: false,
};

function view(overrides: Partial<UpdatesView> = {}): UpdatesView {
  return {
    repo: "kroqdotdev/stowage",
    current: { version: "0.2.0", build: "abc1234" },
    latest: null,
    newer: [],
    updateAvailable: false,
    checkedAt: Date.now(),
    checkError: null,
    updater: { configured: false, reason: "not-configured" },
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("UpdatesSection", () => {
  beforeEach(() => {
    getUpdatesMock.mockReset();
    applyUpdateMock.mockReset();
    getHealthMock.mockReset();
    toastMock.error.mockReset();
    toastMock.success.mockReset();
  });

  it("shows the installed version and that it is up to date", async () => {
    getUpdatesMock.mockResolvedValue(view());
    renderWithClient(<UpdatesSection />);

    expect(
      screen.getByRole("heading", { name: "Updates" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Stowage 0.2.0")).toBeInTheDocument();
    expect(screen.getByText("abc1234")).toBeInTheDocument();
    expect(screen.getByText("Stowage is up to date.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All releases" })).toHaveAttribute(
      "href",
      "https://github.com/kroqdotdev/stowage/releases",
    );
    expect(screen.queryByText("Update by hand")).not.toBeInTheDocument();
  });

  it("lists what is new and shows compose commands when there is no updater", async () => {
    getUpdatesMock.mockResolvedValue(
      view({ latest: release, newer: [release], updateAvailable: true }),
    );
    renderWithClient(<UpdatesSection />);

    expect(await screen.findByText("0.3.0 is available")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "What's new" });
    expect(
      within(list).getByRole("link", { name: "Stowage 0.3.0" }),
    ).toHaveAttribute("href", release.url);
    expect(within(list).getByText("In-app updates")).toBeInTheDocument();
    expect(within(list).getByText("thing")).toBeInTheDocument();

    expect(screen.getByText("Update by hand")).toBeInTheDocument();
    expect(
      screen.getByText(/STOWAGE_VERSION=0\.3\.0 docker compose/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update to 0.3.0" }),
    ).not.toBeInTheDocument();
  });

  it("explains an updater that is configured but unreachable", async () => {
    getUpdatesMock.mockResolvedValue(
      view({
        latest: release,
        newer: [release],
        updateAvailable: true,
        updater: {
          configured: true,
          reachable: false,
          reason: "The updater service is not running.",
        },
      }),
    );
    renderWithClient(<UpdatesSection />);

    expect(
      await screen.findByText("The updater service is not running."),
    ).toBeInTheDocument();
  });

  it("shows the GitHub error instead of a verdict when the check fails", async () => {
    getUpdatesMock.mockResolvedValue(
      view({ checkedAt: null, checkError: "GitHub rate limit reached." }),
    );
    renderWithClient(<UpdatesSection />);

    expect(
      await screen.findByText("GitHub rate limit reached."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Stowage is up to date."),
    ).not.toBeInTheDocument();
  });

  it("re-checks on demand with refresh", async () => {
    getUpdatesMock.mockResolvedValue(view());
    renderWithClient(<UpdatesSection />);
    await screen.findByText("Stowage is up to date.");

    getUpdatesMock.mockResolvedValue(
      view({ latest: release, newer: [release], updateAvailable: true }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Check now" }));

    expect(await screen.findByText("0.3.0 is available")).toBeInTheDocument();
    expect(getUpdatesMock).toHaveBeenLastCalledWith({ refresh: true });
  });

  it("confirms, starts the update and follows its log", async () => {
    const idle = view({
      latest: release,
      newer: [release],
      updateAvailable: true,
      updater: {
        configured: true,
        reachable: true,
        status: {
          state: "idle",
          targetVersion: null,
          startedAt: null,
          finishedAt: null,
          log: [],
          error: null,
        },
      },
    });
    getUpdatesMock.mockResolvedValue(idle);
    applyUpdateMock.mockResolvedValue({
      state: "running",
      targetVersion: "0.3.0",
      startedAt: Date.now(),
      finishedAt: null,
      log: ["Starting update to 0.3.0"],
      error: null,
    });
    getHealthMock.mockResolvedValue({ status: "ok", version: "0.2.0" });
    renderWithClient(<UpdatesSection />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Update to 0.3.0" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Update to 0.3.0?" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Update now" }),
    );

    await waitFor(() => expect(applyUpdateMock).toHaveBeenCalledWith("0.3.0"));
    expect(await screen.findByText("Updating to 0.3.0…")).toBeInTheDocument();
    expect(screen.getByLabelText("Update log")).toHaveTextContent(
      "Starting update to 0.3.0",
    );
    expect(screen.queryByText("Update by hand")).not.toBeInTheDocument();
  });

  it("reports a failed run with its error and lets you dismiss it", async () => {
    getUpdatesMock.mockResolvedValue(
      view({
        latest: release,
        newer: [release],
        updateAvailable: true,
        updater: {
          configured: true,
          reachable: true,
          status: {
            state: "running",
            targetVersion: "0.3.0",
            startedAt: Date.now(),
            finishedAt: null,
            log: ["Pulling images"],
            error: null,
          },
        },
      }),
    );
    getHealthMock.mockResolvedValue({ status: "ok", version: "0.2.0" });
    renderWithClient(<UpdatesSection />);
    expect(await screen.findByText("Updating to 0.3.0…")).toBeInTheDocument();

    // The next poll (every two seconds while an update runs) reports failure.
    getUpdatesMock.mockResolvedValue(
      view({
        latest: release,
        newer: [release],
        updateAvailable: true,
        updater: {
          configured: true,
          reachable: true,
          status: {
            state: "failed",
            targetVersion: "0.3.0",
            startedAt: Date.now() - 5000,
            finishedAt: Date.now(),
            log: ["Pulling images", "manifest unknown"],
            error: "docker compose pull exited with 1",
          },
        },
      }),
    );

    expect(
      await screen.findByText("Update to 0.3.0 failed", {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("docker compose pull exited with 1"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(
      screen.queryByText("Update to 0.3.0 failed"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update to 0.3.0" }),
    ).toBeInTheDocument();
  });
});

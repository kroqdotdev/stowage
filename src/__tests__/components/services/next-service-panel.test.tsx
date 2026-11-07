import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const getScheduleByAssetIdMock = vi.fn();
const getAppSettingsMock = vi.fn();

vi.mock("@/lib/api/service-schedules", () => ({
  getScheduleByAssetId: (assetId: string) => getScheduleByAssetIdMock(assetId),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-07",
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("@/components/services/service-record-form", () => ({
  ServiceRecordForm: ({ mode }: { mode: string }) => (
    <div>Service record form ({mode})</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { NextServicePanel } from "@/components/services/next-service-panel";

function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "schedule1",
    assetId: "asset1",
    nextServiceDate: "2026-03-17",
    intervalValue: 3,
    intervalUnit: "months",
    reminderLeadValue: 14,
    reminderLeadUnit: "days",
    reminderStartDate: "2026-03-03",
    createdAt: 1,
    updatedAt: 1,
    createdBy: "user1",
    updatedBy: "user1",
    ...overrides,
  };
}

function renderPanel(serviceGroupName: string | null = "Engine checks") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <NextServicePanel
        assetId="asset1"
        assetName="Forklift A"
        serviceGroupName={serviceGroupName}
      />
    </QueryClientProvider>,
  );
}

describe("NextServicePanel", () => {
  beforeEach(() => {
    getScheduleByAssetIdMock.mockReset();
    getAppSettingsMock.mockReset();
    getAppSettingsMock.mockResolvedValue({
      serviceSchedulingEnabled: true,
      dateFormat: "DD-MM-YYYY",
    });
  });

  it("shows the due distance, plan and date, interval and reminder when scheduled", async () => {
    getScheduleByAssetIdMock.mockResolvedValue(makeSchedule());
    renderPanel();

    expect(await screen.findByText("In 10 days")).toBeInTheDocument();
    expect(screen.getByText("Engine checks · 17-03-2026")).toBeInTheDocument();
    expect(screen.getByText("Interval")).toBeInTheDocument();
    expect(screen.getByText("Every 3 months")).toBeInTheDocument();
    expect(screen.getByText("Reminder")).toBeInTheDocument();
    expect(screen.getByText("14 days before")).toBeInTheDocument();
    expect(getScheduleByAssetIdMock).toHaveBeenCalledWith("asset1");
  });

  it("states how far overdue a past-due service is", async () => {
    getScheduleByAssetIdMock.mockResolvedValue(
      makeSchedule({ nextServiceDate: "2026-03-04" }),
    );
    renderPanel(null);

    expect(await screen.findByText("Overdue 3 days")).toBeInTheDocument();
    expect(screen.getByText("04-03-2026")).toBeInTheDocument();
  });

  it("uses singular units for an interval or reminder of one", async () => {
    getScheduleByAssetIdMock.mockResolvedValue(
      makeSchedule({
        intervalValue: 1,
        intervalUnit: "years",
        reminderLeadValue: 1,
        reminderLeadUnit: "weeks",
      }),
    );
    renderPanel();

    expect(await screen.findByText("Every year")).toBeInTheDocument();
    expect(screen.getByText("1 week before")).toBeInTheDocument();
  });

  it("offers Log service… and Reschedule… when scheduled", async () => {
    const user = userEvent.setup();
    getScheduleByAssetIdMock.mockResolvedValue(makeSchedule());
    renderPanel();

    await screen.findByText("In 10 days");
    expect(screen.getByRole("link", { name: "Reschedule…" })).toHaveAttribute(
      "href",
      "/assets/asset1/edit#service",
    );

    await user.click(screen.getByRole("button", { name: "Log service…" }));
    expect(
      await screen.findByText("Service record form (complete)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Log service: Forklift A")).toBeInTheDocument();
  });

  it("shows Not scheduled with Schedule… and a plain log entry when there is no schedule", async () => {
    const user = userEvent.setup();
    getScheduleByAssetIdMock.mockResolvedValue(null);
    renderPanel();

    expect(await screen.findByText("Not scheduled")).toBeInTheDocument();
    expect(
      screen.getByText("Set an interval to get reminders before it is due."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schedule…" })).toHaveAttribute(
      "href",
      "/assets/asset1/edit#service",
    );
    expect(screen.queryByRole("link", { name: "Reschedule…" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Log service…" }));
    expect(
      await screen.findByText("Service record form (create)"),
    ).toBeInTheDocument();
  });

  it("hides scheduling when it is turned off in Settings", async () => {
    getAppSettingsMock.mockResolvedValue({
      serviceSchedulingEnabled: false,
      dateFormat: "DD-MM-YYYY",
    });
    getScheduleByAssetIdMock.mockResolvedValue(makeSchedule());
    renderPanel();

    expect(
      await screen.findByText("Service scheduling is turned off in Settings."),
    ).toBeInTheDocument();
    expect(screen.getByText("Not scheduled")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Schedule…/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Log service…" }),
    ).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";

const updateDateFormatMock = vi.fn();
const updateServiceSchedulingEnabledMock = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

import { RegionalSettingsSection } from "@/components/settings/regional-settings-section";

describe("RegionalSettingsSection", () => {
  beforeEach(() => {
    updateDateFormatMock.mockReset();
    updateServiceSchedulingEnabledMock.mockReset();
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    mockUseMutation.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "appSettings:updateDateFormat") {
        return updateDateFormatMock;
      }

      if (functionName === "appSettings:updateServiceSchedulingEnabled") {
        return updateServiceSchedulingEnabledMock;
      }

      throw new Error(`Unexpected mutation reference: ${functionName}`);
    });
    mockUseQuery.mockReturnValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("updates date format and saves selection", async () => {
    const user = userEvent.setup();
    updateDateFormatMock.mockResolvedValueOnce({
      dateFormat: "MM-DD-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: Date.now(),
    });

    render(<RegionalSettingsSection />);

    const select = screen.getByLabelText("Date format");
    expect(select).toHaveValue("DD-MM-YYYY");

    await user.selectOptions(select, "MM-DD-YYYY");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(updateDateFormatMock).toHaveBeenCalledWith({
      dateFormat: "MM-DD-YYYY",
    });
    expect(updateServiceSchedulingEnabledMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Settings updated");
  });

  it("does not clobber unsaved local selection when query re-renders", async () => {
    const user = userEvent.setup();
    const view = render(<RegionalSettingsSection />);

    const select = screen.getByLabelText("Date format");
    await user.selectOptions(select, "MM-DD-YYYY");
    expect(select).toHaveValue("MM-DD-YYYY");

    mockUseQuery.mockReturnValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
    view.rerender(<RegionalSettingsSection />);

    expect(screen.getByLabelText("Date format")).toHaveValue("MM-DD-YYYY");
  });

  it("updates scheduling toggle", async () => {
    const user = userEvent.setup();
    updateServiceSchedulingEnabledMock.mockResolvedValueOnce({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: false,
      updatedAt: Date.now(),
    });

    render(<RegionalSettingsSection />);

    await user.click(screen.getByRole("checkbox", { name: "Enabled" }));
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(updateServiceSchedulingEnabledMock).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Settings updated");
  });
});

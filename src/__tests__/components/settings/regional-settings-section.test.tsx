import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";

const updateDateFormatMock = vi.fn();
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
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    mockUseMutation.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "appSettings:updateDateFormat") {
        return updateDateFormatMock;
      }

      throw new Error(`Unexpected mutation reference: ${functionName}`);
    });
    mockUseQuery.mockReturnValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("renders date format heading and select trigger", () => {
    render(<RegionalSettingsSection />);

    expect(
      screen.getByRole("heading", { name: "Date format" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save format" }),
    ).toBeInTheDocument();
  });

  it("shows loading state when settings are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<RegionalSettingsSection />);

    expect(screen.getByText("Loading preferences...")).toBeInTheDocument();
  });

  it("shows date preview", () => {
    render(<RegionalSettingsSection />);

    expect(screen.getByText("Preview:")).toBeInTheDocument();
    expect(screen.getByText("Using default format.")).toBeInTheDocument();
  });
});

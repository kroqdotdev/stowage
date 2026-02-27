import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const updateDateFormatMock = vi.fn()
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}))

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

import { RegionalSettingsSection } from "@/components/settings/regional-settings-section"

describe("RegionalSettingsSection", () => {
  beforeEach(() => {
    updateDateFormatMock.mockReset()
    mockUseQuery.mockReset()
    mockUseMutation.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()

    mockUseMutation.mockReturnValue(updateDateFormatMock)
    mockUseQuery.mockReturnValue({
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    })
  })

  it("updates date format and saves selection", async () => {
    const user = userEvent.setup()
    updateDateFormatMock.mockResolvedValueOnce({
      dateFormat: "MM-DD-YYYY",
      updatedAt: Date.now(),
    })

    render(<RegionalSettingsSection />)

    const select = screen.getByLabelText("Date format")
    expect(select).toHaveValue("DD-MM-YYYY")

    await user.selectOptions(select, "MM-DD-YYYY")
    await user.click(screen.getByRole("button", { name: "Save date format" }))

    expect(updateDateFormatMock).toHaveBeenCalledWith({
      dateFormat: "MM-DD-YYYY",
    })
    expect(toastSuccessMock).toHaveBeenCalledWith("Date format updated")
  })

  it("does not clobber unsaved local selection when query re-renders", async () => {
    const user = userEvent.setup()
    const view = render(<RegionalSettingsSection />)

    const select = screen.getByLabelText("Date format")
    await user.selectOptions(select, "MM-DD-YYYY")
    expect(select).toHaveValue("MM-DD-YYYY")

    mockUseQuery.mockReturnValue({
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    })
    view.rerender(<RegionalSettingsSection />)

    expect(screen.getByLabelText("Date format")).toHaveValue("MM-DD-YYYY")
  })
})

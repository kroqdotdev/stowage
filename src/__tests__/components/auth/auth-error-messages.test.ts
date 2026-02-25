import { describe, expect, it } from "vitest"
import {
  getLoginErrorMessage,
  getSetupErrorMessage,
} from "@/components/auth/auth-error-messages"

describe("getLoginErrorMessage", () => {
  it("maps invalid credential variants to a safe message", () => {
    expect(getLoginErrorMessage(new Error("InvalidSecret"))).toBe(
      "Invalid email or password",
    )
    expect(getLoginErrorMessage(new Error("InvalidAccountId"))).toBe(
      "Invalid email or password",
    )
    expect(getLoginErrorMessage(new Error("Invalid credentials"))).toBe(
      "Invalid email or password",
    )
  })

  it("hides server stack noise", () => {
    expect(getLoginErrorMessage(new Error("Server Error: stack..."))).toBe(
      "Sign in failed. Please try again.",
    )
  })
})

describe("getSetupErrorMessage", () => {
  it("maps setup completion and validation errors", () => {
    expect(getSetupErrorMessage(new Error("Setup is already complete"))).toBe(
      "Setup is already complete. Sign in instead.",
    )
    expect(
      getSetupErrorMessage(new Error("Password must be at least 8 characters")),
    ).toBe("Password must be at least 8 characters")
    expect(getSetupErrorMessage(new Error("Enter a valid email address"))).toBe(
      "Enter a valid email address",
    )
  })

  it("falls back safely for unknown values", () => {
    expect(getSetupErrorMessage(null)).toBe(
      "Setup failed. Check the form and try again.",
    )
  })
})

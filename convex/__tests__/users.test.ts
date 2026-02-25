import { describe, expect, it } from "vitest"
import {
  normalizeEmail,
  requireValidEmail,
  requireValidName,
  requireValidPassword,
} from "../users-helpers"

describe("users helpers", () => {
  it("normalizes emails", () => {
    expect(normalizeEmail("  ADMIN@Example.COM ")).toBe("admin@example.com")
  })

  it("validates email addresses", () => {
    expect(requireValidEmail("Test@Example.com")).toBe("test@example.com")
    expect(() => requireValidEmail("invalid")).toThrowError("Enter a valid email address")
  })

  it("validates names", () => {
    expect(requireValidName("  Alex Admin  ")).toBe("Alex Admin")
    expect(() => requireValidName("   ")).toThrowError("Name is required")
  })

  it("validates password length", () => {
    expect(requireValidPassword("12345678")).toBe("12345678")
    expect(() => requireValidPassword("short")).toThrowError(
      "Password must be at least 8 characters",
    )
  })
})

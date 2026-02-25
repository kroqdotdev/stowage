import { describe, expect, it } from "vitest"
import {
  isFirstAdminBootstrapAttempt,
  normalizePasswordSignInError,
} from "../auth-helpers"

describe("normalizePasswordSignInError", () => {
  it("normalizes invalid secret errors", () => {
    const normalized = normalizePasswordSignInError(new Error("InvalidSecret"))
    expect(normalized).toBeInstanceOf(Error)
    expect((normalized as Error).message).toBe("Invalid credentials")
  })

  it("normalizes invalid account id errors", () => {
    const normalized = normalizePasswordSignInError(new Error("InvalidAccountId"))
    expect(normalized).toBeInstanceOf(Error)
    expect((normalized as Error).message).toBe("Invalid credentials")
  })

  it("normalizes rate limit errors", () => {
    const normalized = normalizePasswordSignInError(
      new Error("TooManyFailedAttempts"),
    )
    expect((normalized as Error).message).toBe(
      "Too many failed attempts. Try again later.",
    )
  })

  it("passes through unrelated errors", () => {
    const error = new Error("Something else")
    expect(normalizePasswordSignInError(error)).toBe(error)
  })

  it("passes through non-error values", () => {
    expect(normalizePasswordSignInError("nope")).toBe("nope")
  })
})

describe("isFirstAdminBootstrapAttempt", () => {
  it("matches the first admin bootstrap profile", () => {
    expect(
      isFirstAdminBootstrapAttempt({
        type: "credentials",
        existingUserId: null,
        profile: {
          role: "admin",
          createdBy: null,
          email: "admin@example.com",
        },
      }),
    ).toBe(true)
  })

  it("does not match admin creation by another admin", () => {
    expect(
      isFirstAdminBootstrapAttempt({
        type: "credentials",
        existingUserId: null,
        profile: {
          role: "admin",
          createdBy: "user_123",
        },
      }),
    ).toBe(false)
  })

  it("does not match updates or non-admin users", () => {
    expect(
      isFirstAdminBootstrapAttempt({
        type: "credentials",
        existingUserId: "user_123",
        profile: {
          role: "admin",
          createdBy: null,
        },
      }),
    ).toBe(false)

    expect(
      isFirstAdminBootstrapAttempt({
        type: "credentials",
        existingUserId: null,
        profile: {
          role: "user",
          createdBy: null,
        },
      }),
    ).toBe(false)
  })
})

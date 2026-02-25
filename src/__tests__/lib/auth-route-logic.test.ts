import { describe, expect, it } from "vitest"
import {
  getHomeRedirect,
  getLoginPageRedirect,
  getProtectedAppRedirect,
  getSetupPageRedirect,
} from "@/lib/auth-route-logic"

describe("auth route logic", () => {
  it("redirects unauthenticated protected routes to setup on first run", () => {
    expect(
      getProtectedAppRedirect({ firstRun: true, isAuthenticated: false }),
    ).toBe("/setup")
  })

  it("redirects unauthenticated protected routes to login after setup", () => {
    expect(
      getProtectedAppRedirect({ firstRun: false, isAuthenticated: false }),
    ).toBe("/login")
  })

  it("allows authenticated protected routes", () => {
    expect(
      getProtectedAppRedirect({ firstRun: false, isAuthenticated: true }),
    ).toBeNull()
  })

  it("chooses the correct home redirect", () => {
    expect(getHomeRedirect({ firstRun: true, isAuthenticated: false })).toBe(
      "/setup",
    )
    expect(getHomeRedirect({ firstRun: false, isAuthenticated: false })).toBe(
      "/login",
    )
    expect(getHomeRedirect({ firstRun: false, isAuthenticated: true })).toBe(
      "/dashboard",
    )
  })

  it("redirects auth pages appropriately", () => {
    expect(getLoginPageRedirect({ firstRun: true, isAuthenticated: false })).toBe(
      "/setup",
    )
    expect(
      getLoginPageRedirect({ firstRun: false, isAuthenticated: true }),
    ).toBe("/dashboard")
    expect(getLoginPageRedirect({ firstRun: false, isAuthenticated: false })).toBeNull()

    expect(getSetupPageRedirect({ firstRun: false, isAuthenticated: false })).toBe(
      "/login",
    )
    expect(
      getSetupPageRedirect({ firstRun: false, isAuthenticated: true }),
    ).toBe("/dashboard")
    expect(getSetupPageRedirect({ firstRun: true, isAuthenticated: false })).toBeNull()
  })
})

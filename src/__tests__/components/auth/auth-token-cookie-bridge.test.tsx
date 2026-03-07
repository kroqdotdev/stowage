import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const syncAuthTokenCookieMock = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthToken: () => "test-token-123",
}));

vi.mock("@/lib/auth-token-cookie", () => ({
  syncAuthTokenCookie: (...args: unknown[]) =>
    syncAuthTokenCookieMock(...args),
}));

import { AuthTokenCookieBridge } from "@/components/auth/auth-token-cookie-bridge";

describe("AuthTokenCookieBridge", () => {
  it("renders without error and syncs token", () => {
    const { container } = render(<AuthTokenCookieBridge />);

    // Component renders null (no visible output)
    expect(container.innerHTML).toBe("");
    expect(syncAuthTokenCookieMock).toHaveBeenCalledWith("test-token-123");
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUser,
} from "@/hooks/use-current-user";

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapped = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapped.displayName = "TestWrapper";
  return Wrapped;
}

describe("useCurrentUser", () => {
  it("fetches the current user", async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: "u1",
      email: "a@x.com",
      name: "Alex",
      role: "admin",
    });
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.email).toBe("a@x.com");
  });

  it("returns null when unauthenticated", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("uses the expected query key", () => {
    expect(CURRENT_USER_QUERY_KEY).toEqual(["auth", "me"]);
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();
const usePbMock = vi.fn();

vi.mock("@/app/PocketBaseClientProvider", () => ({
  usePocketBase: () => usePbMock(),
}));

import { useRealtimeCollection } from "@/hooks/use-realtime-collection";

function makePb() {
  subscribeMock.mockResolvedValue(unsubscribeMock);
  return {
    collection: () => ({ subscribe: subscribeMock }),
  };
}

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

describe("useRealtimeCollection", () => {
  it('subscribes with "*" and invalidates the cache entry on change', async () => {
    usePbMock.mockReturnValue(makePb());
    subscribeMock.mockClear();
    unsubscribeMock.mockClear();

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ items: [1] })
      .mockResolvedValueOnce({ items: [1, 2] });

    const { result } = renderHook(
      () =>
        useRealtimeCollection({
          collection: "assets",
          queryKey: ["assets"],
          fetcher,
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.data).toEqual({ items: [1] }));
    expect(subscribeMock).toHaveBeenCalledWith("*", expect.any(Function));

    // Simulate a realtime event
    const [, onChange] = subscribeMock.mock.calls[0];
    onChange({});
    await waitFor(() => expect(result.current.data).toEqual({ items: [1, 2] }));
  });

  it("does not subscribe when disabled", async () => {
    usePbMock.mockReturnValue(makePb());
    subscribeMock.mockClear();

    const fetcher = vi.fn();

    renderHook(
      () =>
        useRealtimeCollection({
          collection: "assets",
          fetcher,
          enabled: false,
        }),
      { wrapper: wrapper() },
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

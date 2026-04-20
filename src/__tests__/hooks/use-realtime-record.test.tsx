import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const subscribeMock = vi.fn();
const unsubscribeMock = vi.fn();
const usePbMock = vi.fn();

vi.mock("@/app/PocketBaseClientProvider", () => ({
  usePocketBase: () => usePbMock(),
}));

import { useRealtimeRecord } from "@/hooks/use-realtime-record";

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

describe("useRealtimeRecord", () => {
  it("subscribes to the given record id and cleans up on unmount", async () => {
    usePbMock.mockReturnValue(makePb());
    subscribeMock.mockClear();
    unsubscribeMock.mockClear();

    const fetcher = vi.fn().mockResolvedValue({ id: "r1", value: 1 });

    const { unmount } = renderHook(
      () =>
        useRealtimeRecord({
          collection: "assets",
          recordId: "r1",
          fetcher,
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(subscribeMock).toHaveBeenCalledWith("r1", expect.any(Function));
    expect(fetcher).toHaveBeenCalled();

    unmount();
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalled());
  });

  it("does not subscribe when recordId is null", async () => {
    usePbMock.mockReturnValue(makePb());
    subscribeMock.mockClear();

    const fetcher = vi.fn();

    renderHook(
      () =>
        useRealtimeRecord({
          collection: "assets",
          recordId: null,
          fetcher,
        }),
      { wrapper: wrapper() },
    );

    // Give effects a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

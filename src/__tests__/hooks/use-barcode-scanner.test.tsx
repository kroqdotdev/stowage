import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { createRef } from "react";

import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";

type CallbackFn = (result: unknown, err: unknown, controls: unknown) => void;

const scannerState: {
  capabilities: { torch?: boolean } | undefined;
  lastCallback: CallbackFn | null;
  stop: Mock;
  switchTorch: Mock;
  decodeFromConstraints: Mock;
  throwOnDecode: Error | null;
} = {
  capabilities: undefined,
  lastCallback: null,
  stop: vi.fn(),
  switchTorch: vi.fn(),
  decodeFromConstraints: vi.fn(),
  throwOnDecode: null,
};

vi.mock("@zxing/browser", () => {
  class BrowserMultiFormatReader {
    decodeFromConstraints = scannerState.decodeFromConstraints;
  }
  const BarcodeFormat = { CODE_128: 1, DATA_MATRIX: 2, QR_CODE: 11 };
  return { BrowserMultiFormatReader, BarcodeFormat };
});

function makeControls() {
  const controls = {
    stop: scannerState.stop,
    switchTorch: scannerState.switchTorch,
    streamVideoCapabilitiesGet: () => scannerState.capabilities,
  };
  return controls;
}

function installMediaDevices(
  getUserMedia: Mock = vi.fn().mockResolvedValue({ getTracks: () => [] }),
) {
  (
    navigator as unknown as {
      mediaDevices?: { getUserMedia: Mock };
    }
  ).mediaDevices = { getUserMedia };
  return getUserMedia;
}

function setSecureContext(value: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value,
  });
}

function makeVideoRef() {
  const ref = createRef<HTMLVideoElement | null>();
  (ref as { current: HTMLVideoElement | null }).current =
    document.createElement("video");
  return ref;
}

describe("useBarcodeScanner", () => {
  beforeEach(() => {
    scannerState.capabilities = undefined;
    scannerState.lastCallback = null;
    scannerState.stop = vi.fn();
    scannerState.switchTorch = vi.fn().mockResolvedValue(undefined);
    scannerState.throwOnDecode = null;
    scannerState.decodeFromConstraints = vi
      .fn()
      .mockImplementation(async (_constraints, _video, callback) => {
        if (scannerState.throwOnDecode) throw scannerState.throwOnDecode;
        scannerState.lastCallback = callback;
        return makeControls();
      });

    setSecureContext(true);
    installMediaDevices();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("transitions idle → requesting → scanning when enabled", async () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("scanning"));
  });

  it("returns to idle when disabled and stops the scanner", async () => {
    const videoRef = makeVideoRef();
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useBarcodeScanner({
          videoRef,
          onResult: () => {},
          enabled,
        }),
      { initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.state).toBe("scanning"));

    rerender({ enabled: false });
    await waitFor(() => expect(result.current.state).toBe("idle"));
    expect(scannerState.stop).toHaveBeenCalled();
  });

  it("fires onResult the first time and suppresses duplicates within 2s", async () => {
    const onResult = vi.fn();
    const videoRef = makeVideoRef();
    renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult,
        enabled: true,
      }),
    );

    await waitFor(() => expect(scannerState.lastCallback).not.toBeNull());

    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = {
      getText: () => "https://stowage.local/assets/abc",
      getBarcodeFormat: () => 2,
    };

    act(() => {
      scannerState.lastCallback?.(result, undefined, makeControls());
    });
    expect(onResult).toHaveBeenCalledTimes(1);

    act(() => {
      vi.setSystemTime(now + 500);
      scannerState.lastCallback?.(result, undefined, makeControls());
    });
    expect(onResult).toHaveBeenCalledTimes(1);

    act(() => {
      vi.setSystemTime(now + 2500);
      scannerState.lastCallback?.(result, undefined, makeControls());
    });
    expect(onResult).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("does not suppress distinct texts", async () => {
    const onResult = vi.fn();
    const videoRef = makeVideoRef();
    renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult,
        enabled: true,
      }),
    );
    await waitFor(() => expect(scannerState.lastCallback).not.toBeNull());

    act(() => {
      scannerState.lastCallback?.(
        {
          getText: () => "one",
          getBarcodeFormat: () => 1,
          getResultPoints: () => [{ getX: () => 10, getY: () => 20 }],
        },
        undefined,
        makeControls(),
      );
      scannerState.lastCallback?.(
        {
          getText: () => "two",
          getBarcodeFormat: () => 1,
          getResultPoints: () => [],
        },
        undefined,
        makeControls(),
      );
    });

    expect(onResult).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ text: "one", format: "FORMAT_1" }),
    );
    const firstCall = onResult.mock.calls[0][0];
    expect(firstCall.points).toEqual([{ x: 10, y: 20 }]);
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({ text: "two", format: "FORMAT_1" }),
    );
  });

  it("enters 'denied' state on NotAllowedError", async () => {
    scannerState.throwOnDecode = Object.assign(new Error("user blocked"), {
      name: "NotAllowedError",
    });
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("denied"));
    expect(result.current.error).toBe("user blocked");
  });

  it("enters 'insecure' state outside a secure context", async () => {
    setSecureContext(false);
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("insecure"));
    expect(scannerState.decodeFromConstraints).not.toHaveBeenCalled();
  });

  it("enters 'error' when mediaDevices is missing", async () => {
    (navigator as unknown as { mediaDevices?: unknown }).mediaDevices =
      undefined;
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("error"));
  });

  it("reports torch capability from the active stream", async () => {
    scannerState.capabilities = { torch: true };
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("scanning"));
    expect(result.current.torch.supported).toBe(true);
    expect(result.current.torch.on).toBe(false);
  });

  it("does not report torch when the stream has no capability", async () => {
    scannerState.capabilities = {};
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("scanning"));
    expect(result.current.torch.supported).toBe(false);
  });

  it("toggles the torch via switchTorch and updates state", async () => {
    scannerState.capabilities = { torch: true };
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("scanning"));

    await act(async () => {
      result.current.torch.toggle();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.torch.on).toBe(true));
    expect(scannerState.switchTorch).toHaveBeenCalledWith(true);

    await act(async () => {
      result.current.torch.toggle();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.torch.on).toBe(false));
    expect(scannerState.switchTorch).toHaveBeenCalledWith(false);
  });

  it("stops the scanner on unmount", async () => {
    const videoRef = makeVideoRef();
    const { result, unmount } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("scanning"));
    unmount();
    expect(scannerState.stop).toHaveBeenCalled();
  });

  it("restart() re-invokes decodeFromConstraints", async () => {
    const videoRef = makeVideoRef();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        videoRef,
        onResult: () => {},
        enabled: true,
      }),
    );
    await waitFor(() => expect(result.current.state).toBe("scanning"));
    expect(scannerState.decodeFromConstraints).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.restart();
    });
    await waitFor(() =>
      expect(scannerState.decodeFromConstraints).toHaveBeenCalledTimes(2),
    );
  });
});

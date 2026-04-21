"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { IScannerControls } from "@zxing/browser";

export type ScanResultPoint = { x: number; y: number };

export type ScanResult = {
  text: string;
  format: string;
  points: ScanResultPoint[];
  videoWidth: number;
  videoHeight: number;
};

export type ScannerState =
  | "idle"
  | "requesting"
  | "scanning"
  | "denied"
  | "insecure"
  | "error";

export type TorchControls = {
  supported: boolean;
  on: boolean;
  toggle: () => void;
};

export type UseBarcodeScannerOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  onResult: (result: ScanResult) => void;
  enabled: boolean;
  /** Duplicate-suppression window in ms. Same text within this window fires once. */
  dedupeWindowMs?: number;
};

export type UseBarcodeScannerReturn = {
  state: ScannerState;
  error: string | null;
  torch: TorchControls;
  restart: () => void;
};

const DEFAULT_DEDUPE_WINDOW_MS = 2000;
const MAX_SCAN_TEXT_LENGTH = 2048;
// zxing DecodeHintType enum key for POSSIBLE_FORMATS (inlined to avoid
// importing from @zxing/library, which is only a transitive dep).
const DECODE_HINT_POSSIBLE_FORMATS = 2;

export function useBarcodeScanner(
  options: UseBarcodeScannerOptions,
): UseBarcodeScannerReturn {
  const { videoRef, onResult, enabled } = options;
  const dedupeWindowMs = options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;

  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const controlsRef = useRef<IScannerControls | null>(null);
  const lastResultRef = useRef<{ text: string; at: number } | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    // Capture the video node at effect-run time so the cleanup below always
    // releases the tracks on the element we wired up, even if the ref has
    // been re-pointed (React will re-run the effect in that case anyway).
    const videoAtMount = videoRef.current;

    if (!enabled) {
      teardown(controlsRef);
      clearVideoSource(videoAtMount);
      setState("idle");
      setError(null);
      setTorchSupported(false);
      setTorchOn(false);
      lastResultRef.current = null;
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (typeof window === "undefined") return;
      if (!window.isSecureContext) {
        setState("insecure");
        setError(null);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setState("error");
        setError("Camera API is not available in this browser.");
        return;
      }

      setState("requesting");
      setError(null);

      try {
        const zxing = await import("@zxing/browser");
        const { BrowserMultiFormatReader, BarcodeFormat } = zxing;
        const hints = new Map<number, unknown>();
        hints.set(DECODE_HINT_POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE,
        ]);
        const reader = new BrowserMultiFormatReader(hints);

        const video = videoRef.current;
        if (!video) {
          setState("error");
          setError("Video element is not available.");
          return;
        }

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (cancelled || !result) return;
            const raw = safeGetText(result);
            if (!raw) return;
            const text =
              raw.length > MAX_SCAN_TEXT_LENGTH
                ? raw.slice(0, MAX_SCAN_TEXT_LENGTH)
                : raw;
            const now = Date.now();
            const last = lastResultRef.current;
            if (last && last.text === text && now - last.at < dedupeWindowMs) {
              return;
            }
            lastResultRef.current = { text, at: now };
            const format = safeGetFormat(result);
            const points = safeGetPoints(result);
            const videoEl = videoRef.current;
            onResultRef.current({
              text,
              format,
              points,
              videoWidth: videoEl?.videoWidth ?? 0,
              videoHeight: videoEl?.videoHeight ?? 0,
            });
          },
        );

        if (cancelled) {
          controls.stop();
          clearVideoSource(videoAtMount);
          return;
        }

        // If a previous effect instance already left controls behind (e.g.,
        // two quick `enabled` toggles during the async init above), stop it
        // before replacing — otherwise the old MediaStream keeps the camera
        // indicator on.
        const previous = controlsRef.current;
        if (previous) {
          try {
            previous.stop();
          } catch {
            // ignore
          }
        }
        controlsRef.current = controls;
        setState("scanning");

        const capabilities = controls.streamVideoCapabilitiesGet?.(firstTrack);
        const supportsTorch = Boolean(
          capabilities && "torch" in capabilities && capabilities.torch,
        );
        setTorchSupported(supportsTorch);
        setTorchOn(false);
      } catch (err) {
        if (cancelled) return;
        const mapped = mapGetUserMediaError(err);
        setState(mapped.state);
        setError(mapped.message);
      }
    };

    void run();

    return () => {
      cancelled = true;
      teardown(controlsRef);
      clearVideoSource(videoAtMount);
    };
  }, [enabled, attempt, dedupeWindowMs, videoRef]);

  const toggleTorch = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    const next = !torchOn;
    void controls
      .switchTorch(next)
      .then(() => setTorchOn(next))
      .catch((err) => {
        // leave UI state as-is; log so operators can distinguish "unsupported"
        // from "permission revoked mid-session" during incident response.
        console.warn("[scanner] torch toggle failed", err);
      });
  }, [torchOn]);

  const restart = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return {
    state,
    error,
    torch: {
      supported: torchSupported,
      on: torchOn,
      toggle: toggleTorch,
    },
    restart,
  };
}

function teardown(controlsRef: RefObject<IScannerControls | null>) {
  const controls = controlsRef.current;
  controlsRef.current = null;
  if (controls) {
    try {
      controls.stop();
    } catch (err) {
      console.warn("[scanner] controls.stop() failed", err);
    }
  }
}

function clearVideoSource(video: HTMLVideoElement | null) {
  if (!video) return;
  const stream = video.srcObject;
  if (stream && "getTracks" in stream) {
    try {
      for (const track of (stream as MediaStream).getTracks()) {
        track.stop();
      }
    } catch {
      // ignore — zxing's stop() should have already released tracks
    }
  }
  video.srcObject = null;
}

function firstTrack(track: MediaStreamTrack) {
  return [track];
}

function safeGetText(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const maybe = result as { getText?: () => string; text?: string };
  if (typeof maybe.getText === "function") return maybe.getText();
  if (typeof maybe.text === "string") return maybe.text;
  return null;
}

function safeGetPoints(result: unknown): ScanResultPoint[] {
  if (!result || typeof result !== "object") return [];
  const maybe = result as {
    getResultPoints?: () => Array<{ getX?: () => number; getY?: () => number }>;
    resultPoints?: Array<{ x?: number; y?: number }>;
  };
  const raw = maybe.getResultPoints?.() ?? maybe.resultPoints ?? [];
  const points: ScanResultPoint[] = [];
  for (const p of raw) {
    if (!p) continue;
    const getter = p as { getX?: () => number; getY?: () => number };
    const fallback = p as { x?: number; y?: number };
    const x = getter.getX?.() ?? fallback.x;
    const y = getter.getY?.() ?? fallback.y;
    if (typeof x === "number" && typeof y === "number") {
      points.push({ x, y });
    }
  }
  return points;
}

function safeGetFormat(result: unknown): string {
  if (!result || typeof result !== "object") return "UNKNOWN";
  const maybe = result as {
    getBarcodeFormat?: () => number | string;
    format?: number | string;
  };
  const raw = maybe.getBarcodeFormat?.() ?? maybe.format;
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return `FORMAT_${raw}`;
  return "UNKNOWN";
}

function mapGetUserMediaError(err: unknown): {
  state: ScannerState;
  message: string;
} {
  if (err instanceof Error) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return { state: "denied", message: err.message };
    }
    return { state: "error", message: err.message };
  }
  return { state: "error", message: "Unknown scanner error." };
}

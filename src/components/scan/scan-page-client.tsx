"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import {
  ScanViewport,
  type DetectedFrame,
} from "@/components/scan/scan-viewport";
import { ScanResultSheet } from "@/components/scan/scan-result-sheet";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { resolveScanTarget, type ResolverResult } from "@/lib/scan";
import { cn } from "@/lib/utils";

function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function ScanPageClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [target, setTarget] = useState<ResolverResult | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [resolving, setResolving] = useState(false);
  const [detected, setDetected] = useState<DetectedFrame | null>(null);
  const [pageHidden, setPageHidden] = useState(false);
  // Synchronous re-entry guard for decoder callbacks that fire while a
  // previous `handleScanResult` is still in flight (dedupe window + 1100ms
  // dwell). React state flips lag the next camera frame by a tick; this ref
  // blocks the second call immediately.
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const scannerEnabled =
    target === null && !manualOpen && detected === null && !pageHidden;

  const handleResolved = useCallback((result: ResolverResult) => {
    setTarget(result);
    const vibrate =
      typeof navigator !== "undefined" && "vibrate" in navigator
        ? navigator.vibrate?.bind(navigator)
        : undefined;
    if (vibrate) {
      if (result.status === "asset") vibrate(15);
      else vibrate([10, 60, 10]);
    }
  }, []);

  const handleScanResult = useCallback(
    async (result: {
      text: string;
      points: DetectedFrame["points"];
      videoWidth: number;
      videoHeight: number;
    }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setDetected({
        points: result.points,
        videoWidth: result.videoWidth,
        videoHeight: result.videoHeight,
        phase: "detecting",
      });
      setResolving(true);
      try {
        const [resolved] = await Promise.all([
          resolveScanTarget(result.text, appOrigin()),
          new Promise((resolve) => setTimeout(resolve, 1100)),
        ]);
        if (!mountedRef.current) return;
        setDetected((current) =>
          current ? { ...current, phase: "confirmed" } : current,
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!mountedRef.current) return;
        handleResolved(resolved);
      } catch (err) {
        console.warn("[scan] resolver failed", err);
        if (!mountedRef.current) return;
        toast.error("Couldn't look up the scan. Try again.");
        handleResolved({ status: "unresolved", rawText: result.text });
      } finally {
        if (mountedRef.current) {
          setResolving(false);
          setDetected(null);
        }
        busyRef.current = false;
      }
    },
    [handleResolved],
  );

  const scanner = useBarcodeScanner({
    videoRef,
    enabled: scannerEnabled,
    onResult: (result) => {
      void handleScanResult(result);
    },
  });

  const handleManualSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!manualValue.trim()) return;
      if (busyRef.current) return;
      busyRef.current = true;
      setResolving(true);
      try {
        const resolved = await resolveScanTarget(manualValue, appOrigin());
        if (!mountedRef.current) return;
        setManualOpen(false);
        setManualValue("");
        handleResolved(resolved);
      } catch (err) {
        console.warn("[scan] manual resolver failed", err);
        if (!mountedRef.current) return;
        toast.error("Couldn't look up the tag. Try again.");
        handleResolved({ status: "unresolved", rawText: manualValue });
        setManualOpen(false);
        setManualValue("");
      } finally {
        if (mountedRef.current) setResolving(false);
        busyRef.current = false;
      }
    },
    [manualValue, handleResolved],
  );

  useEffect(() => {
    function onVisibility() {
      // Pausing the scanner when the tab is hidden releases the camera stream
      // (the scanner effect tears down when `enabled` flips to false) so the
      // OS camera indicator turns off and we don't hold the sensor while the
      // page is in the background.
      setPageHidden(document.hidden);
    }
    setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className="relative -m-4 flex min-h-[calc(100svh-8rem)] flex-col items-center gap-5 bg-background px-4 pt-4 pb-10 lg:-m-6 lg:min-h-[calc(100svh-4rem)]"
      data-testid="scan-page"
    >
      <div className="flex w-full items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          data-testid="scan-back"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <TorchButton
          supported={scanner.torch.supported}
          on={scanner.torch.on}
          onToggle={scanner.torch.toggle}
        />
      </div>

      <ScannerBody scanner={scanner} videoRef={videoRef} detected={detected} />

      <Button
        type="button"
        variant="outline"
        data-testid="scan-manual-entry"
        onClick={() => setManualOpen(true)}
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
        Enter asset tag
      </Button>

      <ManualEntrySheet
        open={manualOpen}
        onOpenChange={setManualOpen}
        value={manualValue}
        onChange={setManualValue}
        onSubmit={handleManualSubmit}
        busy={resolving}
      />

      <ScanResultSheet
        target={target}
        resolving={resolving}
        onAssetUpdated={(asset) =>
          setTarget((current) =>
            // Guard against a late mutation from a previously-open asset:
            // only apply the update if it's still the asset the sheet is
            // showing.
            current?.status === "asset" && current.asset.id === asset.id
              ? { status: "asset", asset }
              : current,
          )
        }
        onDismiss={() => setTarget(null)}
      />
    </div>
  );
}

function ScannerBody({
  scanner,
  videoRef,
  detected,
}: {
  scanner: ReturnType<typeof useBarcodeScanner>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detected: DetectedFrame | null;
}) {
  if (scanner.state === "denied") {
    return (
      <ScannerState
        icon={CameraOff}
        title="Camera access is blocked"
        description="Allow camera access in your browser settings, or type the asset tag below."
        testId="scan-state-denied"
      />
    );
  }
  if (scanner.state === "insecure") {
    return (
      <ScannerState
        icon={Lock}
        title="Camera requires HTTPS"
        description="Ask your admin to serve Stowage over HTTPS, or type the asset tag below."
        testId="scan-state-insecure"
      />
    );
  }
  if (scanner.state === "error") {
    return (
      <ScannerState
        icon={CameraOff}
        title="Scanner unavailable"
        description={
          scanner.error ?? "Something went wrong starting the camera."
        }
        testId="scan-state-error"
      />
    );
  }
  return (
    <>
      <ScanViewport
        videoRef={videoRef}
        active={scanner.state === "scanning"}
        detected={detected}
      />
      <p className="text-sm text-muted-foreground">
        {detected?.phase === "confirmed"
          ? "Got it — opening…"
          : detected?.phase === "detecting"
            ? "Barcode detected — reading…"
            : "Point at a Stowage label"}
      </p>
    </>
  );
}

function ScannerState({
  icon: Icon,
  title,
  description,
  testId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div
      className="flex aspect-square w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center"
      data-testid={testId}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-base font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TorchButton({
  supported,
  on,
  onToggle,
}: {
  supported: boolean;
  on: boolean;
  onToggle: () => void;
}) {
  if (!supported) return null;
  const Icon = on ? Flashlight : FlashlightOff;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={on ? "Turn off flashlight" : "Turn on flashlight"}
      aria-pressed={on}
      className={cn("cursor-pointer", on && "text-[var(--scan)]")}
      data-testid="scan-torch"
      onClick={onToggle}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function ManualEntrySheet({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  busy: boolean;
}) {
  return (
    <MobileActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Enter asset tag"
      description="Type the tag printed on the label (or paste a Stowage asset URL)."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3"
        data-testid="scan-manual-form"
      >
        <Input
          autoFocus
          placeholder="AST-0047"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-testid="scan-manual-input"
          aria-label="Asset tag"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 cursor-pointer"
            disabled={busy || !value.trim()}
            data-testid="scan-manual-submit"
          >
            {busy ? "Looking up…" : "Go"}
          </Button>
        </div>
      </form>
    </MobileActionSheet>
  );
}

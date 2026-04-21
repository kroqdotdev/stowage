"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import { ScanViewport } from "@/components/scan/scan-viewport";
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

  const scannerEnabled = target === null && !manualOpen;

  const handleResolved = useCallback((result: ResolverResult) => {
    setTarget(result);
    const vibrate = (typeof navigator !== "undefined" &&
      "vibrate" in navigator) ?
      navigator.vibrate?.bind(navigator) : undefined;
    if (vibrate) {
      if (result.status === "asset") vibrate(15);
      else vibrate([10, 60, 10]);
    }
  }, []);

  const handleScanResult = useCallback(
    async (result: { text: string }) => {
      setResolving(true);
      try {
        const resolved = await resolveScanTarget(result.text, appOrigin());
        handleResolved(resolved);
      } finally {
        setResolving(false);
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
      setResolving(true);
      try {
        const resolved = await resolveScanTarget(manualValue, appOrigin());
        setManualOpen(false);
        setManualValue("");
        handleResolved(resolved);
      } finally {
        setResolving(false);
      }
    },
    [manualValue, handleResolved],
  );

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        // nothing to do — hook re-evaluates from enabled, and the scan line
        // animation pauses automatically via CSS when the tab is hidden.
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
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

      <ScannerBody scanner={scanner} videoRef={videoRef} />

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
        onDismiss={() => setTarget(null)}
      />
    </div>
  );
}

function ScannerBody({
  scanner,
  videoRef,
}: {
  scanner: ReturnType<typeof useBarcodeScanner>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
      />
      <p className="text-sm text-muted-foreground">
        Point at a Stowage label
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

function ScanResultSheet({
  target,
  resolving,
  onDismiss,
}: {
  target: ResolverResult | null;
  resolving: boolean;
  onDismiss: () => void;
}) {
  const open = target !== null;

  if (target?.status === "asset") {
    const { asset } = target;
    return (
      <MobileActionSheet
        open={open}
        onOpenChange={(next) => (next ? null : onDismiss())}
        title={asset.name}
        description={asset.assetTag}
      >
        <div
          className="flex flex-col gap-3"
          data-testid="scan-result-asset"
          data-asset-id={asset.id}
        >
          <p className="text-sm text-muted-foreground">
            Quick actions coming soon — for now, open the asset page to make
            changes.
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              className="flex-1"
              data-testid="scan-result-view"
            >
              <Link href={`/assets/${asset.id}`}>View details</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              data-testid="scan-result-dismiss"
              onClick={onDismiss}
            >
              Scan another
            </Button>
          </div>
        </div>
      </MobileActionSheet>
    );
  }

  if (target?.status === "unresolved") {
    return (
      <MobileActionSheet
        open={open}
        onOpenChange={(next) => (next ? null : onDismiss())}
        title="Couldn't find an asset"
        description={
          target.rawText
            ? `The code was "${target.rawText}" but doesn't match any asset you can access.`
            : "Try scanning again or enter the tag manually."
        }
      >
        <div
          className="flex gap-2"
          data-testid="scan-result-unresolved"
        >
          <Button
            type="button"
            className="flex-1 cursor-pointer"
            data-testid="scan-result-retry"
            onClick={onDismiss}
          >
            Try again
          </Button>
        </div>
      </MobileActionSheet>
    );
  }

  if (resolving) {
    return (
      <MobileActionSheet
        open={true}
        onOpenChange={() => {}}
        title="Looking up asset…"
        description="Resolving the scanned code."
        hideHeader
      >
        <p className="py-2 text-center text-sm text-muted-foreground">
          Looking up asset…
        </p>
      </MobileActionSheet>
    );
  }

  return null;
}

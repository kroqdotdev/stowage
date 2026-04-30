"use client";

import { Button } from "@/components/ui/button";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import { AssetActionsSheet } from "@/components/assets/asset-actions-sheet";
import type { AssetDetail } from "@/lib/api/assets";
import type { ResolverResult } from "@/lib/scan";

const RAW_TEXT_DISPLAY_MAX = 40;

function truncateForDisplay(value: string): string {
  if (value.length <= RAW_TEXT_DISPLAY_MAX) return value;
  return `${value.slice(0, RAW_TEXT_DISPLAY_MAX)}…`;
}

export function ScanResultSheet({
  target,
  resolving,
  onAssetUpdated,
  onDismiss,
}: {
  target: ResolverResult | null;
  resolving: boolean;
  onAssetUpdated: (asset: AssetDetail) => void;
  onDismiss: () => void;
}) {
  if (target?.status === "asset") {
    return (
      <AssetActionsSheet
        open={true}
        asset={target.asset}
        onOpenChange={(open) => {
          if (!open) onDismiss();
        }}
        onAssetUpdated={onAssetUpdated}
        dismissLabel="Scan another ↓"
        testIdPrefix="scan"
      />
    );
  }

  if (target?.status === "unresolved") {
    return (
      <MobileActionSheet
        open={true}
        onOpenChange={(next) => (next ? null : onDismiss())}
        title="Couldn't find an asset"
        description={
          target.rawText
            ? `The code was "${truncateForDisplay(target.rawText)}" but doesn't match any asset you can access.`
            : "Try scanning again or enter the tag manually."
        }
      >
        <div className="flex gap-2" data-testid="scan-result-unresolved">
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
        // Stay dismissible while resolving — a slow lookup shouldn't trap the
        // user in a modal. The resolver is idempotent and the caller already
        // guards state updates with a mounted ref.
        onOpenChange={(next) => (next ? null : onDismiss())}
        title="Looking up asset…"
        description="Resolving the scanned code."
        hideHeader
        aria-label="Looking up asset"
      >
        <p className="py-2 text-center text-sm text-muted-foreground">
          Looking up asset…
        </p>
      </MobileActionSheet>
    );
  }

  return null;
}

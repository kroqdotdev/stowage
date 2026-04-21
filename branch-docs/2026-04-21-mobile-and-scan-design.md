# Mobile-first shell and `/scan` feature

**Branch:** `feat/mobile-scan`
**Date:** 2026-04-21
**Scope:** Make Stowage mobile-friendly and add a camera-driven `/scan` page.

## Summary

Stowage is desktop-only today. This work adds:

1. A responsive shell that swaps the sidebar for a bottom navigation bar on screens below `lg` (1024px).
2. A new `/scan` route that uses the device camera to read Stowage barcodes and opens a quick-actions sheet for the scanned asset.
3. Mobile-friendly layouts for the field flows (assets, asset detail, services, dashboard, locations) and "usable, not polished" treatment for admin flows.
4. A web-app manifest so users can install Stowage to their home screen.

No service worker, no offline support, no push notifications in this scope.

## Navigation

### Desktop (≥1024px)

Unchanged. Existing `AppShell` renders `AppSidebar` + `Topbar` + `<main>`. SCAN does not appear in the sidebar — it is mobile-only.

### Mobile (<1024px)

Sidebar is hidden. A fixed `BottomNav` spans the bottom of the viewport with five slots:

```
Home · Assets · SCAN · Services · More
```

- Home → `/dashboard`
- Assets → `/assets`
- SCAN → `/scan` (elevated center button)
- Services → `/services`
- More → opens a bottom sheet with Locations, Taxonomy, Labels, Settings, Sign out, Theme toggle

The topbar stays but shrinks to logo + search icon + avatar. The existing `SidebarTrigger` is hidden below `lg`. `<main>` gets `pb-20` below `lg` to clear the nav.

### SCAN button

- Icon: `ScanLine` from `lucide-react` (the universal "laser through a frame" icon).
- Shape: 60×60px circle, floats ~18px above the bar on a notched background.
- Colour: a new token `--scan` (teal-600 `#0d9488` light / teal-500 `#14b8a6` dark) with `--scan-foreground` white. Distinct from the existing burnt-orange `--primary`, read as "scanner beam".
- 4px `ring-background`, `shadow-lg` + `shadow-[--scan]/30` glow, `active:scale-95`, `navigator.vibrate(10)` on tap.
- No label beneath; the icon alone carries it.
- No idle animation on the icon. The scan-line sweep lives on the `/scan` page.

## `/scan` page

### Route

`src/app/(app)/scan/page.tsx` → renders `ScanPageClient`. Sits inside the authed app group so the existing `AppLayout` handles access control.

### Layout

Immersive, edge-to-edge. Shell (topbar + bottom nav) stays visible — SCAN must be exitable.

```
┌─────────────────────────────────────┐
│  ← Back                       🔦    │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────┐      │
│    │   [camera preview]      │      │
│    │   ╭─╮             ╭─╮   │      │
│    │                         │      │
│    │  ← animated teal line → │      │
│    │                         │      │
│    │   ╭─╮             ╭─╮   │      │
│    └─────────────────────────┘      │
│                                     │
│      Point at a Stowage label       │
│                                     │
│      ┌───────────────────────┐      │
│      │  Enter asset tag      │      │
│      └───────────────────────┘      │
└─────────────────────────────────────┘
```

- **Reticle.** Four L-shaped corners in `--scan`, 2px stroke, 18px arms, framing a ~260px square.
- **Scan line.** 2px horizontal line in `--scan` sweeping top-to-bottom at ~1.5s per cycle via `@keyframes`. Pauses on `visibilitychange` to save battery.
- **Manual entry.** "Enter asset tag" button is always visible. Opens a sheet with a focused text input that runs the same resolver as a scan.
- **Torch.** Top-right icon. Shown only when the active `MediaStreamTrack` reports `getCapabilities().torch === true`. Toggles via `applyConstraints({ advanced: [{ torch }] })`.
- **Back.** Stops the stream and calls `router.back()`.
- **Permission denied / insecure context.** Replace the camera viewport with a neutral state: `CameraOff` icon, one-line explainer, help link to browser settings, manual-entry button remains.

## Scanner implementation

### `@zxing/browser`

One dependency, one code path, works everywhere including Firefox. Imported dynamically inside the hook so it does not enter the main bundle.

### Hook

`useBarcodeScanner` in `src/hooks/use-barcode-scanner.ts`:

```ts
type ScanResult = { text: string; format: "CODE_128" | "DATA_MATRIX" | "QR_CODE" };

function useBarcodeScanner(options: {
  videoRef: RefObject<HTMLVideoElement>;
  onResult: (result: ScanResult) => void;
  enabled: boolean;
}): {
  state: "idle" | "requesting" | "scanning" | "denied" | "insecure" | "error";
  error: string | null;
  torch: { supported: boolean; on: boolean; toggle: () => void };
  restart: () => void;
};
```

- Dynamic-imports `BrowserMultiFormatReader` restricted to `CODE_128`, `DATA_MATRIX`, `QR_CODE`.
- Camera constraint: `{ facingMode: { ideal: "environment" } }`.
- Decode cadence: ~200ms per frame.
- Duplicate suppression: ignores repeat `text` values within a 2-second window.
- Always stops every `MediaStreamTrack` on unmount and on `enabled: false`.

### Resolver

`src/lib/scan.ts` exports `resolveScanTarget(text, appOrigin)`:

1. If `text` is a URL with matching origin and path `/assets/<id>` → fetch asset detail.
2. Otherwise → unresolved.
3. If asset fetch 404s or is forbidden → unresolved.

Returns `{ status: "asset", asset } | { status: "unresolved", rawText }`. Strict by design — we do not pretend to understand foreign barcodes.

### Post-scan state

The page owns a `target` state. While `target !== null`, the scanner is paused. Dismissing the sheet clears `target` and resumes scanning so the user can walk a row of shelves scanning in sequence.

- Success haptic: `navigator.vibrate?.(15)`.
- Unresolved haptic: `[10, 60, 10]`.
- Asset fetches go through TanStack Query keyed `["asset", id]`, so "View details" opens the asset page from cache.

## Result sheet and quick actions

When `target.status === "asset"`:

```
┌─────────────────────────────────────┐
│            ─── drag handle ───      │
├─────────────────────────────────────┤
│  [STATUS] Drill #47                 │
│  AST-0047 · Workshop / Bench 3      │
├─────────────────────────────────────┤
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ View  │ │Status │ │ Move  │     │
│  └───────┘ └───────┘ └───────┘     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ Photo │ │ Note  │ │Service│     │
│  └───────┘ └───────┘ └───────┘     │
├─────────────────────────────────────┤
│  Scan another ↓                     │
└─────────────────────────────────────┘
```

The six actions:

1. **View details** → `router.push('/assets/' + id)`.
2. **Status** → nested sheet with the five `ASSET_STATUS_OPTIONS` as a radio list → `updateAsset({ status })`.
3. **Move** → nested sheet with a searchable location list → `updateAsset({ locationId })`.
4. **Photo** → `<input type="file" accept="image/*" capture="environment">` launched programmatically → `attachments.uploadAttachment(assetId, file)`.
5. **Note** → single `<textarea>`, appended to `asset.notes` with a timestamp + user prefix.
6. **Log service** → service date, provider (optional), cost (optional), notes (optional) → `serviceRecords.createServiceRecord(...)`.

Status and Move are optimistic. Photo and Log service are pessimistic. Any action except View details returns to the result sheet with the updated asset still shown; the scanner only resumes when the sheet is dismissed.

When `target.status === "unresolved"` the sheet shows the decoded text and two buttons: *Try again*, *Enter manually*.

## Mobile layouts per page

### Field flows (mobile-first redesign)

**Assets list (`/assets`).** Keep `AssetTable` on desktop. Below `lg`, swap in `AssetCardList` — each card shows category dot, name, status badge, asset tag, location path, up to three tag chips. Tap → detail. Long-press or kebab → the same six-action sheet as scan results. Filters move into a bottom sheet triggered by a sticky chip with an active-count badge. Sort becomes a segmented control inside the filter sheet.

**Asset detail (`/assets/:id`).** Hero already stacks on narrow screens; needs less padding and thumb-friendly actions. Edit / Print / Delete collapse into a "⋯" menu. The existing tabs become sticky below the hero so they stay visible while scrolling the field list. Attachments gallery becomes a 2-column grid below `sm`.

**Services list (`/services`).** Grouped card stream with collapsible sections: Overdue, Due this week, Due this month, Upcoming. Each card shows asset name, relative due date, and a "Log service" button that opens the same sheet as the scan flow.

**Dashboard (`/dashboard`).** Single vertical feed on mobile. Order: stats (horizontally scrollable chip row), Upcoming services, Recent assets, Quick actions, Category/Location breakdown (collapsed by default).

**Locations (`/locations`).** Tree becomes a full-width accordion. Each node shows name + asset count + chevron. Create / edit opens a bottom sheet.

### Admin flows (usable, not polished)

**Taxonomy pages (`/categories`, `/tags`, `/fields`).** Tables drop non-essential columns below `md`, keeping name + primary actions. Row-hover kebabs become always-visible buttons that open sheets. Form dialogs become full-height sheets below `md`.

**Label designer (`/labels`).** Canvas drag-and-drop is bad on touch. Below `lg` the page shows the template list only, with a read-only preview for each template and a banner: "Open Stowage on desktop to edit label templates." Printing from mobile keeps working.

**Settings (`/settings`).** Form-shaped already. Needs input sizing and button stacking.

### Shared primitives

- `useMediaQuery(query)` — `matchMedia` wrapper, SSR-safe (returns `false` on server to avoid hydration flicker). Used sparingly; layouts should prefer Tailwind breakpoints.
- `MobileActionSheet` — wrapper around shadcn `Sheet side="bottom"` with drag handle, `env(safe-area-inset-bottom)` padding, shared visual vocabulary.
- `EmptyState` — consolidated component so mobile empty states stay consistent.

## PWA manifest

`public/manifest.webmanifest`:

```json
{
  "name": "Stowage",
  "short_name": "Stowage",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#fafaf9",
  "theme_color": "#c2410c",
  "icons": [
    { "src": "/images/web/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/images/web/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/images/web/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Linked from `src/app/layout.tsx` via `metadata.manifest` and `metadata.themeColor`. Apple meta tags added via `metadata.appleWebApp`.

No service worker. Offline support is deliberately out of scope — a realtime-backed PocketBase app needs conflict resolution and queue semantics we are not taking on in this pass.

## Implementation order

1. `useMediaQuery` hook, `MobileActionSheet`, manifest file — plumbing first.
2. Shell: `BottomNav`, "More" sheet, responsive swap inside `AppShell`.
3. `useBarcodeScanner` hook + `resolveScanTarget` util — no UI, testable in isolation.
4. `/scan` page with camera + reticle + manual entry — still no action sheet.
5. Result sheet + six quick actions — wires real mutation APIs that already exist.
6. Assets list card view + filters sheet.
7. Remaining field-flow polish (asset detail, services, dashboard, locations).
8. Admin page polish (column drops, dialog → sheet, "edit on desktop" for labels).
9. PWA icons + metadata wiring.
10. Tests: Vitest for the scanner hook and resolver; Playwright for bottom nav routing and the scan resolver happy path.

## Open questions

None at the time of writing. Revisit if field-testing shows that:

- Foreign-barcode lookup (question 6 option b) is needed in practice.
- Offline scanning is a real requirement (question 7 option b).
- Tablet portrait should live on the desktop side of the breakpoint.

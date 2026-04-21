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

- `useMediaQuery(query)` — generic `matchMedia` wrapper, SSR-safe (returns `false` on server to avoid hydration flicker). Used sparingly; layouts should prefer Tailwind breakpoints. Added alongside the existing `useIsMobile` (which stays at 768px for the shadcn Sidebar). The mobile shell uses `useMediaQuery("(min-width: 1024px)")`.
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

## Testing plan

Tests are written **alongside** each step, not bolted on at the end. Every step ships with matching Vitest or Playwright coverage before it's considered done. No step lands in a PR without its tests green.

### Vitest (jsdom) — `pnpm test`

Mirror the source structure under `src/__tests__/`. Each new source file gets a corresponding test file.

**New files covered:**

- `src/__tests__/lib/scan.test.ts` — `resolveScanTarget`:
  - URL matching current origin + `/assets/<id>` → resolves to `asset` when fetch succeeds
  - URL on a different origin → `unresolved`
  - URL with matching origin but non-`/assets/` path → `unresolved`
  - Non-URL raw text → `unresolved`
  - Asset fetch returns 404 → `unresolved` (never `error`)
  - Asset fetch returns 403 → `unresolved`
  - Trimming and trailing-slash tolerance on `appOrigin`
- `src/__tests__/hooks/use-barcode-scanner.test.tsx` — the scanner hook's state machine, with `@zxing/browser` and `navigator.mediaDevices` mocked:
  - State transitions `idle` → `requesting` → `scanning` on enable
  - Returns to `idle` on `enabled: false`; all tracks stopped
  - `denied` state when `getUserMedia` rejects with `NotAllowedError`
  - `insecure` state in non-secure context (stubbed `window.isSecureContext = false`)
  - Duplicate-suppression window: same text twice within 2s fires once
  - Distinct text values within the window both fire
  - `torch.supported` reflects `getCapabilities().torch`; toggle calls `applyConstraints`
  - Cleanup on unmount stops every track exactly once
- `src/__tests__/hooks/use-media-query.test.tsx` — `useMediaQuery`:
  - Returns `false` in SSR-ish environment (no `window.matchMedia`)
  - Reflects initial `matches` value
  - Updates when media-query changes fire
  - Removes its listener on unmount
- `src/__tests__/components/layout/bottom-nav.test.tsx`:
  - Renders all five slots with correct icons (`ScanLine` in the center)
  - Scan center button is present with the `--scan` teal styling class
  - Active-route highlighting: Home active on `/dashboard`, Assets active on `/assets` and `/assets/abc`, Services active on `/services`, More active when the sheet is open
  - Tapping More opens the sheet with Locations / Taxonomy / Labels / Settings / theme / sign-out entries
- `src/__tests__/components/scan/scan-page-client.test.tsx`:
  - Renders camera viewport and reticle in idle state
  - Shows "Enter asset tag" button in every state
  - Permission-denied state shows `CameraOff` icon + explainer (no red banner)
  - Insecure-context state shows specific HTTPS explainer
  - Manual entry sheet: submitting tag calls the same resolver, opens result sheet
- `src/__tests__/components/scan/scan-result-sheet.test.tsx`:
  - Renders asset hero + 2×3 action grid
  - All six actions open their nested sheets
  - Status action: submitting a new status calls `updateAsset`; failure rolls back the optimistic update
  - Move action: location picker submit calls `updateAsset({ locationId })`
  - Photo action: file input has `accept="image/*"` and `capture="environment"`; chosen file calls `uploadAttachment`
  - Note action: appends rather than replaces, timestamp + user prefix present
  - Log service action: form submit calls `createServiceRecord` with the expected payload
  - Unresolved sheet renders raw text + Try-again + Enter-manually buttons
- `src/__tests__/components/assets/asset-card-list.test.tsx`:
  - Renders one card per asset with correct name, tag, status, location, up-to-three tag chips + overflow count
  - Tapping card navigates; kebab opens the action sheet
- `src/__tests__/components/layout/mobile-action-sheet.test.tsx`:
  - Drag handle present, backdrop dismisses, safe-area padding class applied

**Existing tests that must stay green:**

- `app-shell`, `app-sidebar`, `topbar`, `use-mobile`, `use-realtime-*` — these exist and must not regress when we add the mobile swap. Any required edits to the shell components are reflected by updating their tests deliberately (not by loosening assertions).

### Vitest (Node / PocketBase) — `pnpm test:pb`

No new backend endpoints are introduced. All scan mutations go through existing `updateAsset`, `uploadAttachment`, `createServiceRecord` whose PB-layer tests already exist in `src/server/**/__tests__`. I'll verify each of those tests still passes after the scan flow wires call them.

### Playwright (e2e) — `pnpm test:e2e`

**Config changes** (`playwright.config.ts`):

- Add a second project `{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }` alongside the existing `chromium`.
- Specs that assert desktop layout run on `chromium` only (via `test.describe.configure({ mode: "serial" })` + project filter).
- Specs that assert mobile layout run on `mobile-chromium` only.
- Specs that test route-level behavior (auth redirects, CRUD round-trips) run on **both** projects so we catch mobile-specific regressions cheaply.
- All existing projects keep `fullyParallel: false, workers: 1` (the suite already shares a PB instance).

**Auth credentials.** Every new authed spec uses the same pattern existing specs use (`e2e/assets.spec.ts`):

```ts
const email = process.env.E2E_AUTH_EMAIL;
const password = process.env.E2E_AUTH_PASSWORD;
test.skip(!email || !password, "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run …");
```

Credentials live in `.env.local` as they already do. Playwright loads them because `pnpm dev:next` reads `.env.local` at boot, which the webServer command triggers. I will not touch `.env.local` or commit credentials.

**New spec files:**

- `e2e/mobile-shell.spec.ts` (runs on `mobile-chromium`):
  - Unauthenticated user visiting a protected route redirects to login (sanity)
  - Bottom nav is visible and sidebar is not, at the mobile viewport
  - Each nav slot routes to its page; SCAN routes to `/scan`
  - "More" opens a sheet containing Locations / Taxonomy / Labels / Settings / Sign out / Theme
  - PWA manifest: `<link rel="manifest">` present, `theme-color` meta present, manifest JSON parses
- `e2e/scan.spec.ts` (runs on both projects):
  - Unauthenticated: `/scan` redirects to login
  - Authenticated on desktop: scan page shows with reticle visible, camera permission prompt simulated (use `context.grantPermissions(['camera'])`)
  - Authenticated on mobile: same, plus bottom nav present
  - Manual entry path: create an asset first, navigate to `/scan`, open manual entry, type the asset's tag, verify result sheet opens with the right name + status
  - Unresolved: type a bogus tag, verify "couldn't find asset" sheet with raw text
  - Status quick action: change status through the sheet, reload asset page, confirm new status
  - Move quick action: change location, reload, confirm new location
  - Note quick action: add a note, reload, confirm note appended (content + timestamp prefix)
  - Log service quick action: create service record, verify it appears in the asset's service list
  - Photo action — skipped unless a fixture image is available; if so, upload and confirm attachment appears
- `e2e/mobile-field-flows.spec.ts` (runs on `mobile-chromium` only):
  - Assets list: cards render instead of table; tap opens detail
  - Assets list: filters sheet opens, filter applies, active count badge updates
  - Asset detail: hero stacks, tabs remain sticky on scroll, kebab menu shows Edit / Print / Delete
  - Services list: Overdue / Due this week / Upcoming groupings render; "Log service" opens sheet
  - Dashboard: single vertical feed, stats row horizontally scrollable
  - Locations: accordion renders, expand/collapse works
  - Labels: shows "Open Stowage on desktop to edit" banner, template list still visible, print still works

**Camera handling in Playwright.** The scanner's decode loop can't be driven deterministically in CI without a synthetic video stream. Two pragmatic choices:

- Every e2e assertion about "what happens after a scan" goes through the **manual-entry input**, which hits the exact same resolver and result-sheet code path as a real decode. Covers 100% of the post-decode UI.
- The scanner hook itself (request camera, start/stop stream, decode loop, duplicate suppression) is tested with **Vitest + mocked MediaStream and mocked zxing** — not Playwright. This is more reliable than driving a fake camera in Chromium.

### "Live" / real-device smoke checklist

Before merging, manually verify on real hardware (checked off in the PR description):

- iOS Safari 17+: camera opens, decodes a printed Code128 label, opens correct asset. Torch-capability probe returns `false` (known limitation); manual entry still works.
- Chrome on Android: camera opens, decodes, torch toggle works, PWA install prompt available.
- Desktop Chrome/Firefox on a 1280px window: sidebar visible. Dev-tools mobile emulator at 375px: bottom nav + scan button visible.
- Install-to-home-screen on iOS: launches full-screen with Stowage icon and theme color.
- `navigator.vibrate` triggers on Android success; no-op on iOS (expected).

These are manual steps noted on the PR, not automated — they're the things that genuinely don't survive in a CI headless browser.

## Implementation order

Each step includes its own tests before it's "done". No blanket "tests at the end" phase.

1. `useMediaQuery` hook **+ its Vitest test**. Manifest file wiring in `src/app/layout.tsx` **+ e2e assertion that the `<link rel="manifest">` is present**.
2. `MobileActionSheet` component **+ Vitest**. `BottomNav` component **+ Vitest for slots, active routes, More sheet**. Responsive swap inside `AppShell`. **New `e2e/mobile-shell.spec.ts`** runs green.
3. `resolveScanTarget` util **+ exhaustive Vitest**. `useBarcodeScanner` hook **+ Vitest with mocked MediaStream and zxing**.
4. `/scan` page UI with camera viewport, reticle, scan-line animation, torch, manual entry, permission-denied state, insecure-context state. Vitest for `ScanPageClient` rendering branches. **`e2e/scan.spec.ts` manual-entry path** goes green.
5. Result sheet + six quick actions. Each action has a Vitest test for the mutation call and optimistic-rollback behavior. Extend `e2e/scan.spec.ts` with the full set of quick-action round-trips.
6. Assets list card view + filters sheet. Vitest for `AssetCardList`. Extend or add `e2e/mobile-field-flows.spec.ts` with the list + filter assertions.
7. Remaining field-flow polish (asset detail, services, dashboard, locations). Each gets added to `e2e/mobile-field-flows.spec.ts`.
8. Admin page polish (column drops, dialog → sheet, "edit on desktop" banner on labels). Minimal e2e: "labels page shows desktop banner on mobile viewport; template list still rendered".
9. PWA icons + Apple meta tags. E2E asserts theme-color + manifest link + start URL.
10. Live device smoke pass (iOS Safari, Android Chrome). Checked off in PR description, not in CI.

## Open questions

None at the time of writing. Revisit if field-testing shows that:

- Foreign-barcode lookup (question 6 option b) is needed in practice.
- Offline scanning is a real requirement (question 7 option b).
- Tablet portrait should live on the desktop side of the breakpoint.

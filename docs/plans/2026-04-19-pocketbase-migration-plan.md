# PocketBase Migration Plan

**Date:** 2026-04-19
**Branch:** `pocketbase-migration`
**Status:** **Ready to merge.** Server, frontend, docker deploy, and full e2e suite all green against a `docker compose up` stack. No Convex code remains.

Replace the Convex backend with a self-hosted PocketBase. Stowage ships as clean installs only; **no existing deployment will carry data across**, so there is no data migration, no ETL, no cutover password flow, no ID redirect table. The bar is functional parity: every feature that works on Convex today must work identically on PocketBase, proven by tests before we land the branch on `main`.

---

## Current status (updated 2026-04-21)

**43 commits on `pocketbase-migration`.** Full test surface:

| Suite                                                                 | Files   | Tests   | Runtime |
| --------------------------------------------------------------------- | ------- | ------- | ------- |
| `pnpm test` (jsdom — components, hooks, lib, api-client)              | 77      | 235     | ~10s    |
| `pnpm test:pb` (real PocketBase — domain + API routes + auth session) | 25      | 245     | ~5s     |
| `pnpm test:e2e` (Playwright against docker-compose stack)             | 13      | 25      | ~28s    |
| **Total**                                                             | **115** | **505** | —       |

Typecheck clean, lint 0 errors. Coverage: **PB suite 85.75% lines / 90.27% functions**, jsdom suite 61% lines / 54% functions. All frontend features run through `/api/**` via TanStack Query. `ConvexClientProvider`, `AuthTokenCookieBridge`, and `auth-token-cookie` lib are removed; `convex/react` and `@convex-dev/auth/react` are no longer imported anywhere in `src/`.

### Done

- **M1 Spike** — PocketBase v0.37.1 wired into `mprocs` + `pnpm pb:setup`; categories domain proven end-to-end with an API route, provider, realtime hook.
- **M2 Test infrastructure** — `src/test/pb-harness.ts` (per-file PB serve on random port + tmp data dir, truncation in reverse FK order with self-ref retry), separate `vitest.pb.config.ts`, `test:pb` script, `.github/workflows/ci.yml` running lint + typecheck + both suites.
- **M3a Schema** — All 16 collections in `pb_migrations/1713484900_remaining_collections.js` (users auth extension, catalog, assets, join tables, service schedules/records/attachments, labelTemplates); FTS5 virtual table + triggers in `1713485000_assets_fts.js`.
- **M3b Auth session layer** — `src/server/auth/{cookies,session,route}.ts`: HttpOnly `pb_auth` cookie, `resolveSession` via PB `authRefresh`, `withSession/withUser/withAdmin` wrappers that forward Next dynamic params. `/api/auth/{login,logout,me,first-run,first-admin}` endpoints. 5 session tests.
- **M4 Catalog domain ports (complete)** — categories, tags, locations (hierarchy + path recompute), customFields, appSettings, serviceProviders, serviceGroups, serviceGroupFields, labelTemplates. Each with 1:1 tests against the harness.
- **M5 Assets + search + dashboard + asset tags** — CRUD with generateAssetTag, custom-field validation across all types, usage-count bookkeeping, tag-intersection filter, weighted search, dashboard aggregates, cascade delete.
- **M5 Service schedules + records** — Interval math, same-day snap-forward, calendar month / upcoming windows, record field snapshots, complete-scheduled-service auto-advance.
- **M5 Users domain** — `listUsers`, `getUserById/Email`, `createUser`, `createFirstAdmin` (gated by `checkFirstRun`), `updateUserRole` (last-admin guard), `changePassword` (verified via scratch PB client). 13 tests.
- **M6 API route handlers** — Every ported domain has thin handlers under `src/app/api/**/route.ts` (~40 routes). Mutations inject `actorId` from the session user; `withAdmin` gates writes on most domains (service-records and /api/users/me/password are user-scope).
- **M6 Attachments + optimization pipeline** — `src/server/domain/{attachments,attachmentsProcessing,serviceRecordAttachments}.ts`. Uploads land in the PB `storageFile` + `originalFile` fields via `FormData`; Jimp re-encodes images (JPEG or PNG depending on alpha) with iterative quality/compression; pdf-lib re-serializes PDFs with object streams. Non-retryable errors (oversized, missing source) stay sticky; retryable failures bounded by `MAX_ATTACHMENT_RETRY_ATTEMPTS=3`. `STORAGE_LIMIT_GB` env var enforces a quota via `StorageQuotaError` (413). Routes: POST/GET `/api/attachments` (multipart), `/[id]`, `/[id]/optimize`, `/queue-status`; mirror routes for `/api/service-record-attachments`; `/api/storage-usage`. 18 tests.

### Authz shape (decision note)

Authz lives at the API route boundary via `withUser` / `withAdmin` rather than inside every domain function. Domain functions keep accepting explicit `actorId` (+ occasionally `actorRole` for owner-or-admin checks); routes strip those fields from client bodies and inject from the resolved session. This keeps domain modules pure and testable while ensuring every write goes through a single authz checkpoint.

### Frontend refactor (M7) — complete

**Shared infrastructure done:**

- `src/lib/api-client.ts` (`apiFetch`, `ApiRequestError`) + typed clients for every `/api/**` resource under `src/lib/api/{auth,categories,tags,locations,custom-fields,app-settings,service-providers,service-groups,label-templates,users,assets,search,dashboard,service-schedules,service-records,attachments}.ts`.
- `useCurrentUser` (GET `/api/auth/me`), `useRealtimeCollection`, and `useRealtimeRecord` for PB SSE-driven cache invalidation.
- Root layout mounts `PocketBaseClientProvider` only; the Convex provider is gone.
- `src/lib/use-app-date-format.ts` reads from `/api/app-settings` via TanStack Query.
- `src/lib/server-auth.ts` resolves the session through `resolveSession(pb_auth)` + `checkFirstRun` — no more Convex fetch.

**UI cutover onto `/api/**` + TanStack Query:\*\*

- Auth shell: `LoginForm` → `/api/auth/login`, `SetupForm` → `/api/auth/first-admin` (autosign-in + cache seed).
- `CategoriesPageClient`, `TagsPageClient`, `LocationsPageClient`, `FieldsPageClient`. All four invalidate on mutate via shared query keys.
- `TaxonomyManager`, `LocationTree`, `location-form-dialog`, `FieldDefinition` and `customFieldDefinitions` call sites now use `id` (not `_id`).
- **Assets feature (full surface):** `AssetsPageClient`, `AssetDetailPageClient`, `AssetCreatePageClient`, `AssetEditPageClient`, `AssetForm`, `AssetDetail`, `AssetFilters`, `AssetTable` plus shared `LocationPicker`/`TagPicker`. Added `GET /api/assets/filter-options` (composes categories/locations/tags/serviceGroups).
- Dashboard, search, attachments, services (list/records/calendar/schedules/history/groups/providers/log dialog/record-attachments/dynamic-form), labels (list + print), settings (all sections), and layout (topbar) are all on the PocketBase-backed API layer.

### Remaining

None blocking merge. Nice-to-haves (not in scope for this branch):

- Wire the Playwright suite into CI (currently runs locally against a
  docker-compose stack; CI runs `test` + `test:pb` only).
- Production deployment guide: reverse-proxy example (Caddyfile/nginx) so
  a public install can put Next + PB on one origin and run the realtime
  websocket without CORS gymnastics.

### Test hardening round (2026-04-21)

Five real migration bugs surfaced once the full Playwright suite ran against
the docker-compose stack (chromium driving the containers over localhost).
All fixed in commit `4531ba7`:

1. **Attachment URLs used the in-container PB hostname.** `attachmentFileUrl`
   composed URLs with `getPbUrl()` → `http://pocketbase:8090`, which the
   browser can't resolve. Added `getPbPublicUrl()` that reads
   `NEXT_PUBLIC_POCKETBASE_URL` (falls back to `POCKETBASE_URL`) and
   switched both file-URL builders to it.
2. **`LogServiceDialog` auto-closed before the user could attach a report.**
   The port added `onSubmitted={() => onClose()}` on the create-mode dialog
   which killed the attach-after-complete flow from the Convex version.
   Dropped the callback (both in the dialog component and in
   `service-history.tsx`).
3. **Manual service-record creation didn't advance the schedule client-side.**
   `createServiceRecord` in `src/lib/api/service-records.ts` typed the
   response as `{ recordId }`, hiding the `nextServiceDate` the server
   already returned. Widened the client type, threaded the result through
   `ServiceRecordForm`'s `onSubmitted`, and invalidated
   `["service-schedules"]` on success.
4. **Asset mutations never invalidated `["dashboard"]`.** TanStack's 30s
   staleTime + no invalidation meant `/dashboard` kept showing pre-create
   data. Added invalidations for `["dashboard"]` and `["service-schedules"]`
   on every asset create/edit/status/delete.
5. **Dashboard service-queue tiebreaker buried new overdue items.** Sort was
   `"nextServiceDate"` + `.slice(0, 5)`, so when several schedules shared a
   due date PB's default creation-order sort pushed the newest one past the
   preview window. Changed to `"nextServiceDate,-createdAt"`.

Plus one UX fix — `CrudModal` had no overflow handling, so tall forms pushed
the close X off-screen. Added `max-h-[calc(100dvh-3rem)] overflow-y-auto` on
the body.

Test infra (same commit):

- Added 36 route-handler tests (`src/app/api/**/__tests__`) covering auth
  guards, zod parsing, status codes, multipart uploads, role changes, and
  password changes against a real PB instance.
- Added 13 hook + `api-client` tests (`ApiRequestError`, FormData path,
  `useCurrentUser`, `useIsMobile`, `useRealtimeRecord`, `useRealtimeCollection`).
- `playwright.config.ts` is now `workers: 1`, `fullyParallel: false`. The
  suite shares one PB instance and several tests toggle app-wide settings
  (scheduling), so parallel workers raced on global state.
- Fixed three test-brittleness bugs: `New password` label, `Add field`
  button, and `dialog.click({position:{x:8,y:8}})` replaced with explicit
  "Close dialog" role clicks.

### Completed merge-gate cleanup (2026-04-20)

- `convex/` directory deleted; `@convex-dev/auth`, `convex`, and `convex-test` removed from `package.json`.
- `CONVEX_URL`/`CONVEX_DEPLOYMENT`/`CONVEX_SITE_URL` stripped from `.env.example`; `NEXT_PUBLIC_CONVEX_URL` removed from `Dockerfile`.
- `src/lib/convex-api.ts` and `src/lib/convex-errors.ts` deleted. `getConvexUiErrorMessage`/`getConvexErrorCode` helpers replaced with a single `getApiErrorMessage(error, fallback)` in `src/components/crud/error-messages.ts` that reads `ApiRequestError.message` (the Convex error-code → UI-string mapping was dead once routes moved to `DomainError`/`ValidationError`/`NotFoundError`).
- `vitest.config.ts` include pattern narrowed to `src/__tests__/**`; eslint ignore for `convex/_generated/**` removed.

### Self-hosted deployment (2026-04-20)

Project is self-host only now — the hosted SaaS path is gone.

- `README.md` + `CONTRIBUTING.md` rewritten around the Next + PocketBase stack; SaaS-specific docs (`docs/saas-provisioning-guide.md`, `docs/saas-storage-api.md`) deleted; `docs/storage-quota.md` reframed as a self-host knob.
- New `Dockerfile.pocketbase` (Alpine + pinned PB 0.37.1 binary + baked `pb_migrations`) and `docker-compose.yml` wire a two-service stack: PB on `:8090` with `./pb_data` persisted, Next on `:3000` pointing at the PB service over the compose network. Next Dockerfile updated to set `PORT=3000` and drop the Convex placeholder env.
- `mprocs.yaml` drops the `convex` proc; `playwright.config.ts` now boots PB + Next together via two `webServer` entries (`pnpm run pb:dev` and `pnpm run dev:next`).
- Residual "matches the Convex implementation" comments in `src/server/domain/{tags,categories,search,locations}.ts` and the attachment optimize route rewritten to explain the actual reason standalone.

**Verified 2026-04-21:** `docker compose up --build` boots both services, the
app serves `/login` + `/dashboard`, `/api/auth/login` sets the cookie, and
the full 25-spec Playwright suite passes against the running stack
(attachments upload + download via the public PB URL, realtime cache
invalidation on mutations, service-record scheduling advancement).

---

## Locked decisions

1. **Server-side logic placement:** Thin PocketBase + Next.js API routes. PB is the DB/auth/files layer. All validation, authz, and workflows live in TypeScript under `src/server/domain/`, exposed via `src/app/api/**` route handlers.
2. **File storage:** Env-configurable. Default to local disk on a Docker volume. Setting `POCKETBASE_S3_*` env vars opts a deployment into S3-compatible storage.
3. **First admin bootstrap:** First-run setup page. While `checkFirstRun()` returns true, `/setup` renders a public form that creates the first admin and auto-signs them in. There is no install token or one-time bootstrap secret in the current implementation.

---

## 1. Architectural shape

**What PocketBase gives us**

- Collections-as-schema over SQLite.
- REST API + realtime subscriptions over SSE.
- Built-in password/OAuth auth with JWT sessions.
- File fields with local or S3 storage and automatic thumbnail generation.
- Admin UI, JS (`pb_hooks`) and Go extension points.
- Single self-hostable binary. Fits our existing `Dockerfile` and `mprocs.yaml`.

**What we lose relative to Convex**

- Automatic reactive queries. PB offers per-record SSE; we manage the cache via TanStack Query.
- End-to-end generated types (`api.ts`, `Doc<"assets">`). The current codebase relies on shared PB helper modules + Zod schemas at the API boundary; `pocketbase-typegen` exists as a script, but it is not part of the checked-in workflow today.
- Isolated function runtime with transactional reads/writes across arbitrary records. PB has per-record hooks + request-scoped transactions, but multi-record logic lives in our Next.js API layer.
- Convex's built-in attachment pipeline. Jimp/pdf-lib optimization moves to a Next.js route.

**Why thin PB + Next API (the locked choice)**

- Jimp and pdf-lib won't run in PB's Goja runtime, so attachment optimization has to live in Next either way.
- The ~60 existing TS domain functions port 1:1 into `src/server/domain/`. No language change, no test-harness rewrite.
- One authz pattern: every write goes through a Next route handler. Easy to grep, easy to audit.
- Realtime reads stay direct client → PB via SSE, so the extra hop applies to writes only, which at our scale is a non-issue.

---

## 2. Data model mapping

Convex table → PocketBase collection, one-to-one at the collection level.

| Convex construct              | PocketBase equivalent                   | Notes                                                               |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `v.id("foo")`                 | `relation` to `foo`                     | PB relations are 15-char strings.                                   |
| `v.union(v.literal(...))`     | `select` with `maxSelect: 1`            | Enum-style options populated from the Convex union.                 |
| `_id`                         | PB auto `id`                            | Native PB IDs; nothing portable from Convex.                        |
| `_creationTime`               | PB `created` timestamp                  | Automatic on every record.                                          |
| `v.array(v.object(...))`      | `json` field                            | PB validates shape loosely; we enforce with Zod in the API layer.   |
| `.index("by_x", ["x"])`       | `indexes` array on collection schema    | 1:1. Unique constraints use `CREATE UNIQUE INDEX`.                  |
| Search index `assets_fts`     | FTS5 virtual table + sync triggers      | Raw SQL in a `pb_migrations/*.js` file.                             |
| Self-ref `locations.parentId` | `relation` to `locations`               | Cascade rules set on the relation.                                  |
| `_storage` file IDs           | `file` field on the owning record       | `attachments`, `serviceRecordAttachments`, `labelTemplates` assets. |
| `@convex-dev/auth` tables     | PB `users` auth collection + extensions | Drop all Convex auth tables.                                        |

**Non-trivial schema items**

- `assets.customFieldValues`, `serviceRecords.values`, `serviceRecords.fieldSnapshots`: `json` fields. Validated on write against `customFieldDefinitions` / `serviceGroupFields` via Zod.
- `locations.path` (hierarchical display string): recomputed in the app-layer `createLocation` / `updateLocation` / `moveLocation` flows, including descendant path rewrites during moves. There is no PocketBase-side hook repairing drift today.
- `users` gets extra fields beyond PB's defaults: `role` (`admin`|`user`), `createdBy`, `createdAt`, `phone`, `phoneVerificationTime`.

---

## 3. Auth

- PB's `users` auth collection replaces `@convex-dev/auth` + Lucia Scrypt.
- Extend the `users` collection with the extra fields above.
- Root layout mounts `PocketBaseClientProvider` so client hooks can subscribe to PB realtime events. Authenticated app state itself is resolved via `/api/auth/me` and server-side route checks, not a client auth-store bridge.
- SSR auth lives in App Router layouts/pages via `src/lib/server-auth.ts`, which reads the HttpOnly `pb_auth` cookie and calls `resolveSession()`. There is no Next.js auth middleware file.

**First-run setup**

- `/setup` renders a public form if and only if `checkFirstRun()` returns true.
- `POST /api/auth/first-admin` accepts `name`, `email`, and `password`, creates the first admin, then sets the `pb_auth` cookie so the user lands on `/dashboard` signed in.
- `checkFirstRun()` currently means "no users exist", not "no admins exist". Creating any user out of band before setup will suppress the setup flow.
- After setup, `/setup` redirects to `/login` (unauthenticated) or `/dashboard` (authenticated); it does not 404.

---

## 4. File storage and the attachment pipeline

**Storage backend — env-configurable**

- Default: local disk under `/pb_data/storage`, mounted as a Docker volume.
- S3 opt-in: set `POCKETBASE_S3_ENABLED=true`, `POCKETBASE_S3_BUCKET`, `POCKETBASE_S3_REGION`, `POCKETBASE_S3_ENDPOINT`, `POCKETBASE_S3_ACCESS_KEY`, `POCKETBASE_S3_SECRET_KEY`.
- PB reads these at startup and picks the backend. Migration script for existing self-hosted users (if any ever want to switch) is out of scope for this branch.

**Optimization pipeline**

Current Convex flow: `attachmentsProcessing.processAttachmentOptimization` runs as `internalAction` (Node runtime), transitions status `pending → processing → ready | failed`.

New flow:

1. Client uploads to `POST /api/attachments` via multipart form data. The server creates the PB record with `status = "pending"` and immediately kicks off optimization in the background.
2. The optimizer loads the file from PB, runs Jimp for images / pdf-lib for PDFs, writes the final blob back to `storageFile`, clears `originalFile`, and updates `status`, `fileSizeOptimized`, and `optimizationAttempts`.
3. `POST /api/attachments/[id]/optimize` is the retry path. It resets a failed/pending attachment back to `pending` and re-runs the optimizer. There is no separate `/retry` route.

PB's built-in thumbs cover the UI thumbnail case; Jimp stays for heavier compression. Status state machine unchanged.

**Storage quota**

- `getStorageUsage` currently sums attachment sizes in application code by scanning the `attachments` and `serviceRecordAttachments` collections.
- Enforced in the create-attachment route handler before accepting the upload.

---

## 5. Server-side logic placement

```
src/server/
  auth/
    cookies.ts           # pb_auth cookie helpers
    route.ts             # withSession / withUser / withAdmin wrappers
    session.ts           # cookie token → session user resolution
  pb/
    client.ts            # admin PB client factory (superuser token)
    context.ts           # admin ctx factory
    attachments.ts       # PB attachment metadata helpers/constants
    assets.ts            # shared asset enums + helpers
    custom-fields.ts     # shared custom-field enums + helpers
    errors.ts            # typed errors → HTTP status
    label-templates.ts
    locations.ts
    service-catalog.ts
    service-schedule.ts
    storage-quota.ts
    users.ts
  domain/
    assets.ts
    assetTags.ts
    attachments.ts
    attachmentsProcessing.ts
    appSettings.ts
    categories.ts
    customFields.ts
    dashboard.ts
    labelTemplates.ts
    locations.ts
    search.ts
    serviceGroups.ts
    serviceGroupFields.ts
    serviceProviders.ts
    serviceRecords.ts
    serviceRecordAttachments.ts
    serviceSchedules.ts
    tags.ts
    users.ts
```

Each domain module exposes plain async functions, largely 1:1 with the Convex functions they replaced.

`src/app/api/**` route handlers are thin: parse request → call domain function → format response. No business logic in route files.

**Client/server split**

- Client reads and writes go through `src/app/api/**` + typed `src/lib/api/*` fetchers.
- The browser talks to PB directly only for realtime subscriptions (`useRealtimeCollection`, `useRealtimeRecord`) and public file URLs.
- All writes, search, dashboard aggregations, and cross-collection shaping stay in Next route handlers + domain modules.

---

## 6. Realtime

- TanStack Query as the cache layer.
- `useRealtimeCollection({ collection, fetcher, queryKey })` wires `pb.collection(collection).subscribe('*', cb)` and invalidates the matching query key on `create`/`update`/`delete`. The `fetcher` usually calls a Next API route.
- `useRealtimeRecord({ collection, recordId, fetcher, queryKey })` does the same for a single record subscription.
- Semantics shift from Convex-style diffs to per-record events. With our data volumes, refetch-on-invalidate is fine and simpler to reason about.

---

## 7. Search

- FTS5 virtual table `assets_fts` over `(name, assetTag, notes)`, content table = `assets`.
- Sync triggers on `assets` insert/update/delete.
- `src/server/domain/search.ts:searchAssets` currently does a weighted TypeScript scan over `assets`, preserving the assetTag > name > notes ordering and then hydrating category name + location path from the related collections.
- The FTS table is present in schema for a future upgrade, but the active query path does not use `MATCH` / `bm25` today.
- Exposed via `GET /api/search?term=...&limit=...`.

Setup lives in `pb_migrations/1713485000_assets_fts.js` so every fresh install gets the FTS table and triggers.

---

## 8. Testing — current coverage

The branch is covered by three active test suites plus the current CI job.

### 8.1 jsdom suite

**Command:** `pnpm test`

- 77 files / 235 tests.
- Covers components, hooks, lib utilities, auth-route logic, and the typed API client layer.
- Includes the migrated UI surfaces for auth, taxonomy, assets, attachments, services, dashboard, labels, settings, layout, and realtime hooks.

### 8.2 PocketBase integration suite

**Command:** `pnpm pb:setup && pnpm test:pb`

- 25 files / 245 tests.
- Uses `src/test/pb-harness.ts` to boot a fresh PocketBase instance on a random port with a tmp data dir per test file, then runs `pb_migrations/` against it.
- Covers the PocketBase-backed domain modules under `src/server/domain/__tests__`, auth session handling, schema assertions, and selected route-handler tests against a real PB instance.
- The current route-handler coverage lives in:
  - `src/app/api/auth/__tests__/auth-routes.test.ts`
  - `src/app/api/users/__tests__/users-routes.test.ts`
  - `src/app/api/assets/__tests__/assets-routes.test.ts`
  - `src/app/api/attachments/__tests__/attachments-routes.test.ts`

### 8.3 Playwright end-to-end suite

**Command:** `pnpm test:e2e`

- 13 spec files / 25 tests.
- `playwright.config.ts` boots `pnpm run pb:dev` and `pnpm run dev:next` locally, then runs Chromium serially (`workers: 1`, `fullyParallel: false`).
- Current browser coverage includes:
  - auth redirects and configured-login/logout flow
  - taxonomy, categories, tags, locations, and custom fields
  - asset create/edit/status flows
  - attachment upload, download, and delete
  - dashboard refresh behavior
  - search
  - service providers, groups, schedules, records, and attachments
  - labels and print view
  - settings, including password validation and scheduling toggle

### 8.4 CI gates and current gaps

- CI currently runs: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm pb:setup`, and `pnpm test:pb`.
- Playwright is not wired into CI yet.
- There is no contract-snapshot/parity suite in the repo.
- There is no `pnpm test:coverage` gate in the current scripts.
- `pocketbase-typegen` is available via `pnpm pb:typegen`, but there is no automated schema-drift diff in CI and no generated `types.generated.ts` checked in.
- There is no dedicated `docs/plans/pb-release-checklist.md` file today.

---

## 9. Deployment

- `mprocs.yaml` runs two local processes: `next` (`pnpm run dev:next`) and `pocketbase` (`pnpm run pb:dev`).
- Docker deploy is a two-service stack:
  - `Dockerfile` builds the Next standalone app image.
  - `Dockerfile.pocketbase` downloads the pinned PocketBase 0.37.1 binary and bakes in `pb_migrations/`.
  - `docker-compose.yml` runs them as `app` and `pocketbase`.
- Volume: `/pb_data` for PB's SQLite + local file storage. Mounted as `./pb_data` in the compose stack.
- Env vars:
  - **Added:**
    - `POCKETBASE_URL` — base URL PB is reachable at from Next.
    - `NEXT_PUBLIC_POCKETBASE_URL` — base URL the browser uses for PB realtime/file URLs.
    - `POCKETBASE_SUPERUSER_EMAIL`, `POCKETBASE_SUPERUSER_PASSWORD` — used by the admin PB client and `pnpm pb:bootstrap`.
    - `STORAGE_LIMIT_GB` — optional attachment quota.
    - `SITE_URL` — optional base URL embedded in label QR codes.
  - **Removed:** `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `CONVEX_SITE_URL`, `NEXT_PUBLIC_CONVEX_URL`, `PROVISION_SECRET`.
- `pnpm pb:bootstrap` upserts a PocketBase superuser against the local `./pb_data` directory; the repo does not auto-generate bootstrap credentials on first boot.
- Public deployment should reverse-proxy Next + PB onto one origin so browser-side PB realtime/file requests do not need cross-origin handling.
- Schema: version-controlled in `pb_migrations/*.js` so every install comes up deterministically.

---

## 10. Milestone recap

1. **Spike:** PocketBase wired into local dev with an initial categories end-to-end slice.
2. **Test infrastructure:** `pb-harness`, separate `vitest.pb.config.ts`, and CI coverage for lint + typecheck + both Vitest suites.
3. **Schema + auth:** full `pb_migrations/`, `pb_auth` cookie-based session handling, `/api/auth/*` routes, and `/setup` gated by `checkFirstRun()`.
4. **Catalog domain:** categories, tags, locations, custom fields, app settings, service providers, service groups, service-group fields, and label templates.
5. **Assets + dashboard + search:** asset CRUD, asset tags, filter options, dashboard aggregations, and weighted search.
6. **Attachments:** asset attachments, service-record attachments, optimization pipeline, retry path, and storage quota enforcement.
7. **Services + users:** service schedules, service records, calendar/upcoming queries, user management, and password change flow.
8. **Frontend cutover:** all remaining pages/components moved to `/api/**` + TanStack Query, with PB realtime hooks for cache invalidation.
9. **Hardening + self-host deploy:** Playwright bugfix round, Convex cleanup, README/CONTRIBUTING rewrite, and Docker compose deployment for Next + PocketBase.

---

## 11. Risk register

| Risk                                                                                          | Mitigation                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Realtime semantic differences break components that rely on cross-entity reactivity           | jsdom component/hook coverage plus Playwright flows exercise the current invalidation model; add explicit subscriptions where needed.                                                         |
| Multi-record atomicity on asset delete (touches `assetTags`, `attachments`, `serviceRecords`) | Sequence writes in one Next API call with dedicated PB integration coverage in §8.2.                                                                                                          |
| `/setup` race or accidental suppression of bootstrap                                          | Current implementation relies on the clean-install assumption plus `checkFirstRun()`. There is no install-token hardening yet, so bootstrap should be completed immediately after first boot. |
| Missing FK validation (PB relations are strings)                                              | Zod at the API/domain boundary plus explicit existence checks in domain functions and PB integration tests.                                                                                   |
| Search ranking regression vs. Convex's weighted scorer                                        | Search behavior is now locked by the TypeScript scorer in `src/server/domain/search.ts`, with jsdom + Playwright coverage rather than a separate parity suite.                                |
| Attachment optimization reliability without Convex's retry semantics                          | Explicit retry endpoint (`POST /api/attachments/[id]/optimize`) + `optimizationAttempts` counter + PB integration tests + Playwright coverage.                                                |
| SQLite single-writer contention under realistic load                                          | Load-test during milestone 5; enable WAL mode; batch attachment writes.                                                                                                                       |
| Schema drift between code assumptions and `pb_migrations/`                                    | Version-controlled migrations plus `src/server/pb/__tests__/schema.test.ts`; there is no automated `pocketbase-typegen` diff gate yet.                                                        |

---

## 12. Out of scope

- Data migration from existing Convex deployments. All Stowage installs are clean; no ETL, no password reset, no ID redirects.
- Dual-write or shadow-replica phases.
- Multi-tenancy changes. Current single-tenant model is preserved.
- New product features. Functional parity only.

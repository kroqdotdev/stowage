# PocketBase Migration Plan

**Date:** 2026-04-19
**Branch:** `pocketbase-migration`
**Status:** Server side complete (domains + auth session layer + API routes + attachments/optimization pipeline). Frontend refactor is the last major chunk.

Replace the Convex backend with a self-hosted PocketBase. Stowage ships as clean installs only; **no existing deployment will carry data across**, so there is no data migration, no ETL, no cutover password flow, no ID redirect table. The bar is functional parity: every feature that works on Convex today must work identically on PocketBase, proven by tests before we land the branch on `main`.

---

## Current status (updated 2026-04-20)

**14 commits on `pocketbase-migration`.** Test surface: **204 PB tests across 21 files**, **440 main tests** (jsdom + convex-test), typecheck clean, lint 0 errors.

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

### In flight / remaining

- **Frontend refactor (M7)** — The big remaining chunk. Every `useQuery`/`useMutation` call site (~60 components) switches to TanStack Query + `useRealtimeCollection`/`useRealtimeRecord`, talking to the new `/api/**` routes. This also fixes up the `/setup` and `/login` forms to POST to `/api/auth/first-admin` and `/api/auth/login`, and replaces `src/lib/server-auth.ts` Convex calls with a direct PB `resolveSession` check.
- **E2E** — Playwright flows against the PB stack.

### Not yet touched

- Convex directory still present and building; removal is the merge gate (M10).
- Dockerfile + prod deployment story for the two-process setup.

---

## Locked decisions

1. **Server-side logic placement:** Thin PocketBase + Next.js API routes. PB is the DB/auth/files layer. All validation, authz, and workflows live in TypeScript under `src/server/domain/`, exposed via `src/app/api/**` route handlers.
2. **File storage:** Env-configurable. Default to local disk on a Docker volume. Setting `POCKETBASE_S3_*` env vars opts a deployment into S3-compatible storage.
3. **First admin bootstrap:** First-run setup page. When no admin exists, `/setup` renders a public form to claim the first admin account. Gated by a one-time install token written to `/pb_data/.install-token` on first boot; the form accepts the token to close the race window. No HTTP provisioning secret, no CLI.

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
- End-to-end generated types (`api.ts`, `Doc<"assets">`). Replaced with `pocketbase-typegen` + Zod schemas at the API boundary.
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

| Convex construct | PocketBase equivalent | Notes |
|---|---|---|
| `v.id("foo")` | `relation` to `foo` | PB relations are 15-char strings. |
| `v.union(v.literal(...))` | `select` with `maxSelect: 1` | Enum-style options populated from the Convex union. |
| `_id` | PB auto `id` | Native PB IDs; nothing portable from Convex. |
| `_creationTime` | PB `created` timestamp | Automatic on every record. |
| `v.array(v.object(...))` | `json` field | PB validates shape loosely; we enforce with Zod in the API layer. |
| `.index("by_x", ["x"])` | `indexes` array on collection schema | 1:1. Unique constraints use `CREATE UNIQUE INDEX`. |
| Search index `search_assets` | FTS5 virtual table + sync triggers | Raw SQL in a `pb_migrations/*.js` file. |
| Self-ref `locations.parentId` | `relation` to `locations` | Cascade rules set on the relation. |
| `_storage` file IDs | `file` field on the owning record | `attachments`, `serviceRecordAttachments`, `labelTemplates` assets. |
| `@convex-dev/auth` tables | PB `users` auth collection + extensions | Drop all Convex auth tables. |

**Non-trivial schema items**

- `assets.customFieldValues`, `serviceRecords.values`, `serviceRecords.fieldSnapshots`: `json` fields. Validated on write against `customFieldDefinitions` / `serviceGroupFields` via Zod.
- `locations.path` (hierarchical display string): recomputed in `createLocation` / `moveLocation` API; a `pb_hooks` after-write hook re-verifies the subtree to catch drift.
- `users` gets extra fields beyond PB's defaults: `role` (`admin`|`user`), `createdBy`, `createdAt`, `phone`, `phoneVerificationTime`.

---

## 3. Auth

- PB's `users` auth collection replaces `@convex-dev/auth` + Lucia Scrypt.
- Extend the `users` collection with the extra fields above.
- Replace `ConvexAuthProvider` with a `PocketBaseProvider` that wraps `pb.authStore` and rehydrates from the PB cookie (`pb_auth`).
- Replace `AuthTokenCookieBridge` with Next.js middleware that reads the PB cookie so SSR sees the authenticated user.

**First-run setup**

- On first boot, PB (or a Next startup task) writes a random token to `/pb_data/.install-token`.
- `/setup` renders a public form if and only if no user with `role = "admin"` exists.
- The form requires the install token as an extra field; once accepted, the token file is deleted.
- After setup, `/setup` always 404s.

---

## 4. File storage and the attachment pipeline

**Storage backend — env-configurable**

- Default: local disk under `/pb_data/storage`, mounted as a Docker volume.
- S3 opt-in: set `POCKETBASE_S3_ENABLED=true`, `POCKETBASE_S3_BUCKET`, `POCKETBASE_S3_REGION`, `POCKETBASE_S3_ENDPOINT`, `POCKETBASE_S3_ACCESS_KEY`, `POCKETBASE_S3_SECRET_KEY`.
- PB reads these at startup and picks the backend. Migration script for existing self-hosted users (if any ever want to switch) is out of scope for this branch.

**Optimization pipeline**

Current Convex flow: `attachmentsProcessing.processAttachmentOptimization` runs as `internalAction` (Node runtime), transitions status `pending → processing → ready | failed`.

New flow:

1. Client uploads to PB via multipart POST with `status = "pending"`.
2. Client calls `POST /api/attachments/[id]/optimize`.
3. Route handler loads the file from PB, runs Jimp for images / pdf-lib for PDFs, writes the optimized blob back to the same record's `optimizedFile` field, updates `status`, `fileSizeOptimized`, `optimizationAttempts`.
4. `POST /api/attachments/[id]/retry` re-triggers the same endpoint.

PB's built-in thumbs cover the UI thumbnail case; Jimp stays for heavier compression. Status state machine unchanged.

**Storage quota**

- `getStorageUsage` becomes a SQL aggregation over the PB `_pb_files_meta` table (or `SUM(fileSizeOptimized + fileSizeOriginal)` across attachment collections).
- Enforced in the create-attachment route handler before accepting the upload.

---

## 5. Server-side logic placement

```
src/server/
  pb/
    client.ts            # admin PB client factory (superuser token)
    authz.ts             # requireAuthenticatedUser / requireAdmin
    errors.ts            # typed errors → HTTP status
    schema.ts            # Zod schemas mirroring collection fields
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

Each module exposes plain async functions, 1:1 with the Convex functions they replace.

`src/app/api/**` route handlers are thin: parse request → call domain function → format response. No business logic in route files.

**Reads that may go direct to PB (skipping Next) for realtime**

- Lookup lists: categories, tags, customFieldDefinitions, labelTemplates, serviceProviders, serviceGroups, appSettings.
- Filtered assets list (filter string composed client-side).

**Reads/writes that must go through Next**

- All writes, without exception (single authz pattern).
- Search (FTS query construction).
- Dashboard aggregations.
- Anything that joins across collections where the result shape differs from PB's `expand` output.

---

## 6. Realtime

- TanStack Query as the cache layer.
- `useRealtimeCollection(name, filter)` wires `pb.collection(name).subscribe('*', cb)` and invalidates matching query keys on `create`/`update`/`delete`.
- `useRealtimeRecord(name, id)` for detail views.
- Semantics shift from Convex-style diffs to per-record events. With our data volumes, refetch-on-invalidate is fine and simpler to reason about.

---

## 7. Search

- FTS5 virtual table `assets_fts` over `(name, assetTag, notes)`, content table = `assets`.
- Sync triggers on `assets` insert/update/delete.
- `src/server/domain/search.ts:searchAssets` runs `SELECT ... FROM assets_fts WHERE assets_fts MATCH ? ORDER BY bm25(assets_fts) ...` with a manual boost for exact `assetTag` equality to preserve the assetTag > name > notes ordering.
- Joins category name and location path inline.
- Exposed via `GET /api/search?term=...&limit=...`.

Setup lives in `pb_migrations/<timestamp>_search_fts.js` so every fresh install gets the FTS table and triggers.

---

## 8. Testing — comprehensive regression coverage

The PB branch cannot land until tests prove every feature works identically to the Convex version. Seven layers.

### 8.1 Contract snapshots — capture current Convex behavior

**Purpose:** lock down what the app does today so the new implementation is provably equivalent.

- Written on `main` (Convex version) before the PB work lands.
- `convex/__tests__/contract/*.test.ts` — one file per public Convex function.
- For every query/mutation/action, record:
  - Input shape covering every validator branch.
  - Output shape + values over a golden seed dataset.
  - Authz behavior (authenticated user, unauthenticated, admin, non-admin).
  - Error cases (not found, duplicate, validation failure).
- Results serialized to `__snapshots__/*.json`, committed alongside tests.

Covers every function in the inventory: ~60 functions → ~300 snapshot cases when cross-producted with authz states.

### 8.2 Domain-module unit tests against a real PB instance

**Purpose:** prove each `src/server/domain/*.ts` module works against a real SQLite PB.

- `src/server/domain/__tests__/**`.
- Helper `pbTestHarness()`:
  - Boots `pocketbase serve` on a random port with a tmp data dir, one per Vitest worker.
  - Runs `pb_migrations/` to the latest schema.
  - Returns admin SDK client + record factories (`makeUser`, `makeAsset`, `makeCategory`, …).
  - Tears down on suite end.
- Each test covers happy path, every `throw` branch (auth, not found, validation, quota), and `EXPLAIN QUERY PLAN` assertions on perf-sensitive queries (search, asset list with filters, calendar month).
- 1:1 parity with the existing `convex/__tests__/` suite: every Convex test has a mirror PB test with the same assertions.

Files to port (from the inventory): auth, users, locations, categories, tags, custom fields, service schedules, storage quota, label templates, search, assetTags, serviceProviders, serviceRecords, serviceSchedules, serviceGroups, labelTemplates, attachments.

**Running the suite locally**

```sh
pnpm pb:setup     # one-time: download ./bin/pocketbase
pnpm test:pb      # runs src/server/**/__tests__/**/*.test.ts against fresh PB per file
```

**Writing a new PB domain test** — see `src/server/domain/__tests__/categories.test.ts` for the canonical shape. Key pattern:

```ts
import { usePbHarness } from "@/test/pb-harness";

describe("my domain", () => {
  const getHarness = usePbHarness();
  const ctx = () => ({ pb: getHarness().admin });

  it("...", async () => {
    await myDomainFunction(ctx(), input);
  });
});
```

### 8.3 Regression parity tests

**Purpose:** prove the PB implementation matches the Convex behavior captured in §8.1.

- `tests/parity/**` loads each snapshot from §8.1, calls the matching PB domain function with the same inputs, asserts deep-equal on outputs.
- Where the Convex snapshot contains Convex IDs, the parity adapter ignores ID-shape differences but still validates relational integrity (e.g., "categoryName resolves to the same value").
- Any output delta fails the test with a diff.
- Required CI check on the `pocketbase-migration` branch.

### 8.4 API route handler tests

**Purpose:** prove the HTTP surface (the thing the client actually calls) is correct.

- `src/app/api/**/__tests__/*.test.ts`.
- Per route:
  - Cookie-based auth passes and fails correctly.
  - Method allowlist enforced.
  - Zod validation rejects malformed payloads with the right status + error shape.
  - Response shape matches the documented contract.
  - Rate-limit / quota paths exercised where relevant.
  - CSRF behavior for state-changing routes.

### 8.5 Component tests — ported, not deleted

**Purpose:** keep the ~60 existing component tests passing through the transition.

- Replace `vi.mock("convex/react")` mocks with TanStack Query mocks. Prop-level data shapes are unchanged, so most tests only swap the mock layer.
- For components subscribing to realtime, add a `MockRealtime` provider that drives update events.
- Every existing component test must still pass. Removing a test requires a written justification in the PR description, which gets linked from `docs/plans/pb-removed-tests.md`.

### 8.6 End-to-end tests — Playwright

**Purpose:** prove the full stack works in a browser. Every flow runs against Convex (on `main`) and PB (on `pocketbase-migration`) and must pass identically.

- **Install/bootstrap:** fresh container → `/setup` appears → install token accepted → first admin created → `/setup` 404s afterwards.
- **Auth:** sign in, sign out, change password, role gates (admin-only pages redirect non-admins).
- **Assets:** create → edit → tag → move location → add custom field values → upload attachment → wait for optimization → view → delete.
- **Attachments:** upload image (verify thumbnail + optimized size), upload PDF (verify optimized), upload unsupported type (verify error), retry failed optimization, delete attachment (verify file removed from storage).
- **Search:** type 2+ chars → results ranked by assetTag > name > notes; verify category name and location path on results.
- **Service records:** create group + fields → attach group to asset → create schedule → complete scheduled service → verify snapshot fields frozen on the record.
- **Calendar:** scheduled services render on correct dates; cross-month navigation; timezone edge cases.
- **Dashboard:** counts match fixture data; upcoming services list correct; overview numbers stable.
- **Labels:** create label template → generate label for asset → print view renders barcodes correctly.
- **Catalog CRUD:** categories, tags, locations (with hierarchy move), custom fields, service providers, service groups — create, update, delete, delete-in-use guardrails.
- **Admin:** create user → assign role → delete user → verify role gates.
- **Storage quota:** upload up to quota boundary, one upload beyond → correct error, existing files still accessible.
- **Realtime:** open two tabs, mutate in one, the other updates within the debounce window.
- **App settings:** change date format, verify formatting across asset list, calendar, service records.

New E2E tests specific to this branch:

- **Install token security:** `/setup` without a valid install token is rejected; expired token rejected.
- **Schema invariant:** after any E2E flow, run a referential-integrity check across all relations.
- **Realtime subscription lifecycle:** navigating away from a page cleanly unsubscribes (no SSE leaks).

### 8.7 Coverage + hygiene gates

- Baseline coverage captured from `main` (Convex) before the branch starts. CI on `pocketbase-migration` fails if overall line coverage drops below that baseline.
- `pnpm test:parity` must run green on every PR to the branch.
- CI runs: `lint`, `typecheck`, `vitest` (domain + component + parity), `playwright` (full E2E against both Convex and PB), `pnpm test:coverage` gate, schema-drift check (verify `pb_migrations/` matches the generated `pocketbase-typegen` types).

### 8.8 Manual verification checklist

Before merging to `main`, a human runs `docs/plans/pb-release-checklist.md` (to be written alongside the branch): every feature exercised in the admin UI, every role tested, 10MB attachment upload, non-ASCII input in search and asset names, timezone flip on a schedule.

---

## 9. Deployment

- `mprocs.yaml`: add a `pocketbase` service for dev parity with prod.
- `Dockerfile`: multi-stage build. Stage 1 builds Next; stage 2 bundles Next + the PB binary. Alternatively two images in `docker-compose.yml` sharing a volume — pick based on ops preference during the spike.
- Volume: `/pb_data` for PB's SQLite + local file storage. Mounted in both dev (`./pb_data`) and prod (named Docker volume).
- Env vars:
  - **Added:**
    - `POCKETBASE_URL` — base URL PB is reachable at from Next.
    - `POCKETBASE_SUPERUSER_EMAIL`, `POCKETBASE_SUPERUSER_PASSWORD` — set on first boot by an init script if not already present.
    - `POCKETBASE_S3_*` — optional, opts into S3 storage.
  - **Removed:** `CONVEX_DEPLOYMENT`, `CONVEX_URL`, `CONVEX_SITE_URL`, `NEXT_PUBLIC_CONVEX_URL`, `PROVISION_SECRET`.
- Backups: cron `pocketbase backup` to the storage volume; docs point operators at PB's built-in backup API for off-box copies.
- Schema: version-controlled in `pb_migrations/*.js` so every install comes up deterministically.

---

## 10. Sequenced milestones

1. **Spike (1–2 days):** PB locally; port `categories.ts` + `assets.ts:listAssets` end-to-end (provider, typegen, one realtime query, one mutation). Confirm wiring works.
2. **Test infrastructure (2 days):** contract snapshots captured on `main`; `pbTestHarness()` written; CI gates configured.
3. **Schema + auth (3–5 days):** full collection schema in `pb_migrations/`, Next auth provider + middleware, `/setup` page with install token.
4. **Catalog domain (2–3 days):** categories, tags, locations (incl. hierarchical move + path recompute), customFields, labelTemplates, appSettings, serviceGroups/Fields/Providers.
5. **Assets + search (3–5 days):** asset CRUD, asset tags join, FTS5 search, filter options, dashboard queries.
6. **Attachments (3–4 days):** upload flow, optimization pipeline in Next API, deletion cascades, storage quota, S3 opt-in wiring.
7. **Service records + schedules (3–4 days):** records with snapshots, schedules, calendar queries, upcoming-services previews.
8. **Frontend cutover (3–5 days):** replace every `useQuery`/`useMutation` call site; wire TanStack Query + realtime hooks; fix component tests.
9. **E2E + manual QA (2 days):** full Playwright run against PB; manual checklist; fix regressions.
10. **Merge gate:** parity suite green, E2E green on both backends, coverage at or above baseline, manual checklist signed off. Delete `convex/` directory, remove Convex dependencies, merge to `main`.

Total: ~4 weeks focused; schedule for 6 with buffer.

---

## 11. Risk register

| Risk | Mitigation |
|---|---|
| Realtime semantic differences break components that rely on cross-entity reactivity | Component tests (§8.5) audit realtime assumptions; add explicit subscriptions where needed. |
| Multi-record atomicity on asset delete (touches `assetTags`, `attachments`, `serviceRecords`) | Sequence writes in one Next API call with compensating cleanup on failure; dedicated test in §8.2. |
| `/setup` race: someone hits the page before the operator | Install token gate; token file deleted after first use. |
| Missing FK validation (PB relations are strings) | Zod at every API boundary + referential-integrity test in §8.6. |
| Search ranking regression vs. Convex's weighted scorer | Parity test §8.3 locks expected rankings on a fixed corpus. |
| Attachment optimization reliability without Convex's retry semantics | Explicit retry endpoint + `optimizationAttempts` counter + backoff; E2E in §8.6. |
| SQLite single-writer contention under realistic load | Load-test during milestone 5; enable WAL mode; batch attachment writes. |
| Schema drift between `pb_migrations/` and `pocketbase-typegen` output | CI gate in §8.7 regenerates types and fails on diff. |

---

## 12. Out of scope

- Data migration from existing Convex deployments. All Stowage installs are clean; no ETL, no password reset, no ID redirects.
- Dual-write or shadow-replica phases.
- Multi-tenancy changes. Current single-tenant model is preserved.
- New product features. Functional parity only.

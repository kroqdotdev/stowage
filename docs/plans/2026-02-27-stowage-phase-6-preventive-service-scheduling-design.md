# Phase 6 Design: Preventive Service Scheduling

Date: 2026-02-27
Status: Validated

## Goal

Add an opt-in (default enabled) preventive maintenance scheduler that lets admins and asset editors define recurring service plans per asset, visualize upcoming due dates, and drive maintenance priorities from one consistent data model.

## Scope

In scope:

- Admin setting `serviceSchedulingEnabled` (default `true`)
- Optional asset schedule inputs: next due date, interval, reminder lead
- Dedicated `serviceSchedules` table keyed by `assetId`
- Services list sorted by nearest due date (overdue naturally first)
- Services calendar sub-tab (`/services/calendar`)
- Dashboard 7-day due-date preview card

Out of scope:

- Service completion workflow details and provider lifecycle (handled in later Service Lifecycle phase)
- Reminder channels (email/push/webhook)
- Multi-reminder rules

## Product Decisions (Validated)

- New dedicated phase inserted immediately after Asset Management.
- Interval model supports flexible units: `days`, `weeks`, `months`, `years`.
- Reminder model is one lead offset per schedule (value + unit).
- Overdue schedules remain overdue until service is logged; no auto-rollforward.
- Scheduling toggle is global in admin settings.
- Dashboard 7-day widget uses service **due date** entries.
- Services list default sorting is shortest time to due date first.
- Calendar is a Services sub-tab (`/services/calendar`).
- Schedule storage uses dedicated `serviceSchedules`, not `assets` fields.

## Architecture

Backend extends Convex with:

- `serviceSchedules` domain functions in `convex/serviceSchedules.ts`
- supporting validation/date helpers in `convex/service_schedule_helpers.ts`
- schema additions in `convex/schema.ts`
- app setting extension in `convex/appSettings.ts`

Frontend extends:

- asset form with optional `ServiceScheduleFields`
- services navigation tabs and two views (`/services` list, `/services/calendar` month grid)
- dashboard card for due dates in next 7 days
- admin settings toggle in settings page

The schedule model is separated from core asset records to keep asset CRUD stable and to enable focused indexing for calendar/list queries.

## Data Model

### `serviceSchedules`

- `assetId`: `Id<"assets">` (one active schedule per asset)
- `nextServiceDate`: string in canonical `YYYY-MM-DD`
- `intervalValue`: number (`> 0`)
- `intervalUnit`: `"days" | "weeks" | "months" | "years"`
- `reminderLeadValue`: number (`>= 0`)
- `reminderLeadUnit`: `"days" | "weeks" | "months" | "years"`
- `createdAt`, `updatedAt`
- `createdBy`, `updatedBy`

Indexes:

- `by_assetId`
- `by_nextServiceDate`

### `appSettings` extension

- `serviceSchedulingEnabled: boolean` (default true)

## Convex Function Contract

- `getScheduleByAssetId(assetId)`
- `upsertSchedule({ assetId, nextServiceDate, intervalValue, intervalUnit, reminderLeadValue, reminderLeadUnit })`
- `deleteSchedule({ assetId })`
- `listScheduledAssets({ fromDate?, toDate? })`
- `listCalendarMonth({ year, month })`
- `listUpcomingServiceDueInDays({ days })`

Validation and errors:

- strict date and interval validation at mutation boundary
- structured `ConvexError` codes:
  - `SCHEDULING_DISABLED`
  - `INVALID_DATE`
  - `INVALID_INTERVAL`
  - `ASSET_NOT_FOUND`
  - `FORBIDDEN`

Authorization:

- schedule writes require authenticated admin/authorized editor checks
- reads follow asset visibility constraints

## UI + Data Flow

1. Admin controls toggle in settings.
2. Asset create/edit form conditionally renders schedule fields when toggle enabled.
3. On save:
   - if schedule entered, call `upsertSchedule`
   - if cleared on edit, call `deleteSchedule`
4. Services list queries scheduled assets sorted by next due date.
5. Calendar view queries month range via indexed due dates.
6. Dashboard queries next 7 days of due dates for quick action.

UI behavior:

- scheduler fields are optional
- due-date statuses computed client-side from canonical due date
- when toggle off, scheduling UI is hidden and schedule writes are blocked by backend guard

## Error Handling

- Frontend maps Convex error codes to short Sonner toasts.
- List/calendar/dashboard surfaces fail soft with empty/loading/error-safe states.
- Invalid schedule inputs are blocked client-side for UX, but backend remains source of truth.

## Implementation Quality Guardrails

Use `vercel-react-best-practices` during implementation:

- avoid client waterfalls by starting independent queries early
- prevent unnecessary rerenders with derived state at render time
- keep bundles lean by route-level component boundaries for calendar/list views

Use Convex best practices:

- strict `args` and `returns` validators
- indexed queries for all due-date range reads
- idempotent mutations where possible
- clear separation of public vs internal functions for sensitive operations

## Testing Plan

- `convex/__tests__/serviceSchedules.test.ts`:
  - create/update/delete schedule
  - invalid interval/date cases
  - scheduling-disabled guard
  - due-date sort correctness
  - month and 7-day range queries
- component tests:
  - scheduler fields conditional rendering + validation
  - services list default sorting and status badges
  - calendar day mapping
  - admin toggle behavior
- `e2e/service-scheduling.spec.ts`:
  - toggle behavior
  - create asset with schedule
  - verify services list/calendar visibility
  - verify dashboard 7-day card entries

## Acceptance Criteria

- Admin toggle is enabled by default and persists in settings.
- Asset form supports optional schedule input with flexible interval/reminder units.
- `/services` list sorts by nearest due date.
- `/services/calendar` displays due dates in month view.
- Dashboard displays due assets in next 7 days.
- All tests pass: `pnpm test && pnpm test:e2e && pnpm typecheck && pnpm lint`.

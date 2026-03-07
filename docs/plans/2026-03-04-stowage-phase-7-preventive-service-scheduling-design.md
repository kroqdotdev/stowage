# Phase 7 Design: Preventive Service Scheduling

Date: 2026-03-04
Status: Validated

## Goal

Implement preventive service scheduling as a planning layer for assets, with strict validation and clear due-date visibility across asset forms, services planner views, and dashboard previews.

## Scope

In scope:

- Global admin toggle `serviceSchedulingEnabled` (default enabled).
- Optional schedule inputs on asset create/edit:
  - next service date
  - interval value + unit
  - reminder lead value + unit
- Dedicated `serviceSchedules` backend model (separate from `assets`).
- Services planner list and calendar views driven by due date.
- Dashboard preview for the next 7 due dates.

Out of scope:

- Service completion history and provider lifecycle in this phase.
- Automatic creation of service records when schedules are edited.
- Reminder channels (email, push, webhook).

## Validated Product Decisions

- Schedule write permissions follow asset edit permissions (not admin-only).
- If any schedule field is entered, all schedule fields are required.
- Selecting `today` as next service date means "service now"; persisted due date is normalized to `today + interval`.
- UI must explain this behavior next to the date input when today is selectable.
- This normalization does not create a service history record.
- `due soon` status is computed from each schedule's own reminder lead.
- Validation must reject schedules where `reminderLead > interval`.
- If scheduling is disabled:
  - existing schedule data is preserved
  - schedule UI is hidden
  - schedule writes are blocked
  - planner views are hidden behind a disabled state

## Architecture

Backend:

- `convex/serviceSchedules.ts` for queries/mutations.
- `convex/service_schedule_helpers.ts` for interval/date validation, canonical date math, and range helpers.
- `convex/schema.ts` adds `serviceSchedules` and extends `appSettings`.
- `convex/appSettings.ts` supports reading/updating scheduling toggle.

Frontend:

- `ServiceScheduleFields` component integrated into asset create/edit.
- `/services` list view sorted by nearest due date.
- `/services/calendar` month-grid due-date view.
- Dashboard 7-day due preview card.
- Settings toggle section for admins.

## Data Model

`serviceSchedules`:

- `assetId`
- `nextServiceDate` (`YYYY-MM-DD`)
- `intervalValue`
- `intervalUnit` (`days|weeks|months|years`)
- `reminderLeadValue`
- `reminderLeadUnit` (`days|weeks|months|years`)
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

Indexes:

- `by_assetId` (single schedule per asset enforcement)
- `by_nextServiceDate` (list, month, and 7-day range reads)

`appSettings` extension:

- `serviceSchedulingEnabled: boolean`

## Error Contract

Use structured `ConvexError` payloads for predictable UI handling:

- `SCHEDULING_DISABLED`
- `INVALID_DATE`
- `INVALID_INTERVAL`
- `ASSET_NOT_FOUND`
- `FORBIDDEN`

## Testing Focus

- Schema/function tests for create/update/delete/list and sorting correctness.
- Guard tests for disabled scheduling and invalid interval/reminder combinations.
- Normalization test for `nextServiceDate === today`.
- Component tests for conditional field rendering and validation behavior.
- E2E test for full scheduling flow across settings, asset form, services planner, and dashboard preview.

## Follow-up Phase

A dedicated Phase 7.5 handles configurable service records and service groups:

- groups managed under `/services/groups`
- one group per asset
- required dynamic fields per group
- service-report attachments on service records

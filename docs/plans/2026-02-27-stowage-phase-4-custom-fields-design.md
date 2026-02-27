# Phase 4 Design: Custom Field Definitions

Date: 2026-02-27
Status: Validated

## Scope

Phase 4 adds reusable custom field definitions and rendering primitives that Phase 5 assets will consume.

In scope:
- `customFieldDefinitions` backend model and admin CRUD.
- Field ordering with drag-and-drop reorder.
- Seven fixed field types: `text`, `number`, `date`, `dropdown`, `checkbox`, `url`, `currency`.
- Safe type-edit constraints and delete-in-use protection hooks.
- Reusable dynamic form/display components.
- Global app date display setting with admin control.

Out of scope:
- Asset form integration (Phase 5).
- Labeling, attachments, service workflows (later phases).

## Architecture And Data Model

Backend adds two tables:

1. `customFieldDefinitions`
- `name`: string
- `fieldType`: enum of 7 allowed types
- `options`: string[] (only used for `dropdown`)
- `required`: boolean
- `sortOrder`: number
- `createdAt`, `updatedAt`: number

2. `appSettings`
- singleton logical row keyed by `key = "global"`
- `dateFormat`: enum `"DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD"`

Storage contract for date field values remains canonical `YYYY-MM-DD`. Display format is derived from app settings.

## Components And Data Flow

Frontend is split into focused pieces:
- `FieldsPageClient`: loads definitions, handles admin permissions, mutation wiring, and list state.
- `FieldDefinitionForm`: create/edit dialog with type-specific controls.
- `DynamicField`: form input renderer by definition type.
- `DynamicFieldDisplay`: read-only renderer by definition type.
- `RegionalSettingsSection`: admin-only date format setting on `/settings`.

Mutations are authoritative for all validation and invariant checks. UI performs immediate validation for usability but treats backend responses as final.

## Validation And Error Handling

Required behavior:
- Dropdown options are normalized (trim, drop empties, case-insensitive dedupe).
- Unsafe type changes are blocked when existing values would become incompatible.
- Deleting in-use fields is blocked.
- Definition writes and setting updates are admin-only.

Error shape uses stable codes from Convex (for deterministic toast mapping):
- `FORBIDDEN`
- `INVALID_FIELD_TYPE`
- `INVALID_DROPDOWN_OPTIONS`
- `UNSAFE_TYPE_CHANGE`
- `FIELD_IN_USE`
- `INVALID_DATE_FORMAT`

UI maps these to Sonner toasts with concise action-oriented messages.

## Date Format Rules

- Canonical stored value for custom date fields: `YYYY-MM-DD`.
- Default display format: `DD-MM-YYYY`.
- Admin can switch global display format in `/settings`.
- Allowed display formats are fixed to three options.
- Formatting utility is centralized so all date displays can converge on the same behavior.

## Testing Plan

Backend tests:
- custom field create/update/delete/reorder and sort behavior
- dropdown validation and normalization
- admin guards
- app settings date-format read/write and enum validation

Component tests:
- `DynamicField` for all seven types
- `DynamicFieldDisplay` formatting behavior and null handling
- date rendering for each display format option

Phase gate:
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- Mark Phase 4 tasks complete only after all checks pass.

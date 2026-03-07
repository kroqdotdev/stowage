# Stowage Label System Design

## Scope

Phase 9 adds a label system for defining templates, rendering labels with real
asset data, and printing them accurately for single assets and batch
selections. The scope is intentionally narrow:

- store label templates in Convex
- render Data Matrix and Code 128 elements with `bwip-js`
- provide a hybrid label designer at `/labels`
- support print preview at `/labels/print`
- wire entry points from asset detail and selected assets in the asset list

The phase does not include rotation, grouping, rich text editing, or
template-level scripting.

## Confirmed Decisions

- Designer model: hybrid canvas editor with drag/resize plus exact numeric
  controls
- Default templates:
  - `35x12mm`: asset tag + Data Matrix
  - `57x32mm`: asset name + asset tag + location + Data Matrix
- Encoded payload: asset detail URL
- Batch printing: selected assets go to a dedicated preview page before
  printing

## Architecture

Convex stores template definitions and default-template state. The Next app is
responsible for resolving asset values, rendering label previews, and running
the print flow. This keeps the storage model simple and avoids turning Convex
into a graphics engine.

Templates are stored in a `labelTemplates` table with:

- `name`
- `normalizedName`
- `widthMm`
- `heightMm`
- `elements`
- `isDefault`
- audit fields

Each element stores:

- `id`
- `type`
- `xMm`
- `yMm`
- `widthMm`
- `heightMm`
- optional text props (`fontSize`, `fontWeight`, `textAlign`)
- type-specific props (`fieldId`, `text`)

Supported element types:

- `assetName`
- `assetTag`
- `category`
- `location`
- `customField`
- `staticText`
- `barcode`
- `dataMatrix`

## UI Structure

`/labels` uses a three-column editor:

- left: template list and create actions
- center: scaled canvas preview with selection, drag, and resize
- right: selected element properties and template settings

Canvas interaction is constrained:

- drag inside bounds
- resize from a corner handle
- light snap grid
- no rotation
- no grouping

`/labels/print` is a shell-free protected route so the app sidebar and topbar
never contaminate printed output.

## Rendering

One shared label renderer is used for both screen preview and print. The print
page reuses the same composition tree but switches to exact mm dimensions and
print CSS. This prevents preview/print drift.

Data Matrix and Code 128 are rendered as inline SVG via `bwip-js`. If
generation fails, the renderer shows a visible fallback box instead of crashing
the page.

The encoded value defaults to the asset detail URL:

`{origin}/assets/{assetId}`

## Data Flow

- `labelTemplates` queries/mutations manage templates
- a small idempotent mutation ensures default templates exist
- asset detail sends one asset to `/labels/print`
- asset list sends selected asset ids to `/labels/print`
- print preview loads the selected template and assets, then renders labels

The designer preview uses a real asset sample when available and falls back to
placeholder data when the inventory is empty.

## Error Handling

Backend errors:

- invalid template dimensions
- invalid element payloads
- duplicate template names
- deleting the default template
- missing template or missing asset

Frontend errors:

- missing selection for batch print
- no templates available
- barcode generation failure fallback
- empty-state guidance when no assets exist for preview

## Testing

Phase 9 requires:

- Convex tests for template CRUD and default-template exclusivity
- component tests for barcode rendering and label preview value resolution
- e2e for creating a template, saving it, previewing a single asset label, and
  opening batch preview from the asset list

Validation gate:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:e2e`

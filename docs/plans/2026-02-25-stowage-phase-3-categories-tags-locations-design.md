# Phase 3 Design: Categories, Tags, and Locations

Date: 2026-02-25
Status: Approved for implementation

## Scope

Phase 3 adds CRUD management for categories, tags, and locations.

- Categories: table + modal forms
- Tags: table + modal forms
- Locations: tree + detail side panel
- Reuse shared CRUD UI patterns where possible

## Decisions

### UI Patterns

- Categories and tags use a table layout with modal create/edit forms.
- Locations use a tree on the left and an editable detail side panel on the right.
- Location create/edit/delete actions use dialogs where confirmation is required.
- User feedback uses `sonner` toasts for success and error states.

### Shared vs Specialized Architecture

- Build a shared CRUD UI foundation for table shells, modal shells, and form controls.
- Keep Convex functions domain-specific (`categories`, `tags`, `locations`) to preserve entity-specific validation and guards.
- Keep the locations tree rendering specialized while reusing shared form and error-handling patterns.

### Validation Rules

- Categories and tags:
  - name required
  - case-insensitive duplicate name rejection
  - normalized hex color (`#RRGGBB`)
- Locations:
  - name required
  - sibling-level uniqueness (`parentId` + normalized name)
  - move via parent selector in side panel
  - prevent moving a node under itself or a descendant
  - recompute `path` on rename/move for the node and descendants
  - prevent delete when child locations exist

### Location UX

- Selecting a node opens an editable detail panel (name, description, parent).
- Parent selector supports moving a node.
- The panel shows a path preview and save/reset actions.
- Tree nodes include expand/collapse and action menu buttons.

### Color UX

- Categories and tags use preset swatches plus a hex input.
- The form shows a live color preview.

## Phase 3 Implementation Notes

- `assetTags` depends on the future `assets` table (added in a later phase). Phase 3 will implement category/tag/location CRUD and location hierarchy first, while keeping delete guards ready to add asset-reference checks once the assets schema exists.
- Prefer clear, short labels and error messages.
- Keep interactions keyboard accessible and mobile-safe.

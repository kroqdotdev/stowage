# Missing Tests Plan

Tests identified during code review that are out of scope for the current fix branch.
Tackle these as a follow-up to ensure full coverage.

## Missing Component Tests (S49)

Priority order (page-client components first, then feature components, then UI primitives):

### High Priority — Page Client Components (stateful, route-level)
- [ ] `src/components/dashboard/dashboard-stats-bar.tsx`
- [ ] `src/components/dashboard/recent-assets-card.tsx`
- [ ] `src/components/dashboard/upcoming-services-widget.tsx`
- [ ] `src/components/dashboard/category-breakdown.tsx`
- [ ] `src/components/dashboard/location-breakdown.tsx`
- [ ] `src/components/dashboard/quick-actions-card.tsx`
- [ ] `src/components/dashboard/quick-actions.tsx`
- [ ] `src/components/dashboard/upcoming-service-due-7-day-card.tsx`
- [ ] `src/components/assets/asset-detail.tsx`
- [ ] `src/components/assets/asset-detail-page-client.tsx`
- [ ] `src/components/assets/asset-create-page-client.tsx`
- [ ] `src/components/assets/asset-edit-page-client.tsx`
- [ ] `src/components/categories/categories-page-client.tsx`
- [ ] `src/components/tags/tags-page-client.tsx`
- [ ] `src/components/fields/fields-page-client.tsx`
- [ ] `src/components/locations/locations-page-client.tsx`
- [ ] `src/components/services/services-list-page-client.tsx`
- [ ] `src/components/services/services-calendar-page-client.tsx`
- [ ] `src/components/services/service-group-detail-page-client.tsx`
- [ ] `src/components/services/service-providers-page-client.tsx`
- [ ] `src/components/labels/labels-page-client.tsx`
- [ ] `src/components/labels/label-print-page-client.tsx`
- [ ] `src/components/settings/settings-page-client.tsx` (admin rendering path)

### Medium Priority — Feature Components
- [ ] `src/components/catalog/taxonomy-manager.tsx`
- [ ] `src/components/tags/tag-picker.tsx`
- [ ] `src/components/fields/field-definition-form.tsx`
- [ ] `src/components/locations/location-form-dialog.tsx`
- [ ] `src/components/services/service-group-editor.tsx`
- [ ] `src/components/services/service-group-fields-panel.tsx`
- [ ] `src/components/services/service-group-assets-panel.tsx`
- [ ] `src/components/services/service-record-attachments.tsx`
- [ ] `src/components/services/asset-service-records-panel.tsx`
- [ ] `src/components/services/services-nav-tabs.tsx`
- [ ] `src/components/services/log-service-dialog.tsx`
- [ ] `src/components/services/service-record-form.tsx`
- [ ] `src/components/services/service-history.tsx`
- [ ] `src/components/services/services-scheduled-list.tsx`
- [ ] `src/components/labels/template-designer.tsx`
- [ ] `src/components/labels/template-canvas.tsx`
- [ ] `src/components/labels/element-properties.tsx`
- [ ] `src/components/labels/element-toolbar.tsx`
- [ ] `src/components/labels/label-print.tsx`
- [ ] `src/components/settings/features-section.tsx`
- [ ] `src/components/settings/password-change-section.tsx`

### Lower Priority — CRUD / Auth Primitives
- [ ] `src/components/crud/crud-table.tsx`
- [ ] `src/components/crud/confirm-dialog.tsx`
- [ ] `src/components/crud/modal.tsx`
- [ ] `src/components/crud/color-field.tsx`
- [ ] `src/components/attachments/attachment-list.tsx`
- [ ] `src/components/attachments/attachments-panel.tsx`
- [ ] `src/components/auth/auth-panel.tsx`
- [ ] `src/components/auth/auth-token-cookie-bridge.tsx`

## Missing E2E Specs (S50)

- [ ] Custom fields page (`/fields`) — admin CRUD workflow for field definitions
- [ ] Settings page (`/settings`) — user creation, role management, password change, regional settings
- [ ] Taxonomy manager (`/taxonomy`) — combined category/tag view
- [ ] Dashboard (`/dashboard`) — verify stats, recent assets, upcoming services render correctly
- [ ] Search — global search functionality end-to-end

## Other Test Improvements

- [ ] S51: Add vitest coverage threshold configuration (discuss target % with team)
- [ ] S7 (Playwright): Add Firefox and WebKit browser projects for CI
- [ ] E2E cleanup: Tests should clean up created data to prevent accumulation
- [ ] E2E `createAsset` helper: Standardize `serviceGroupId` parameter across all test files

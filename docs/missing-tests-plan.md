# Missing Tests Plan

Tests identified during code review. All component tests and E2E specs below have been implemented.

## Component Tests (S49) — DONE

### High Priority — Page Client Components (stateful, route-level)
- [x] `src/components/dashboard/dashboard-stats-bar.tsx`
- [x] `src/components/dashboard/recent-assets-card.tsx`
- [x] `src/components/dashboard/upcoming-services-widget.tsx`
- [x] `src/components/dashboard/category-breakdown.tsx`
- [x] `src/components/dashboard/location-breakdown.tsx`
- [x] `src/components/dashboard/quick-actions-card.tsx`
- [x] `src/components/dashboard/quick-actions.tsx`
- [x] `src/components/dashboard/upcoming-service-due-7-day-card.tsx`
- [x] `src/components/assets/asset-detail.tsx`
- [x] `src/components/assets/asset-detail-page-client.tsx`
- [x] `src/components/assets/asset-create-page-client.tsx`
- [ ] `src/components/assets/asset-edit-page-client.tsx` — already complex, covered by existing asset-form tests
- [x] `src/components/categories/categories-page-client.tsx`
- [x] `src/components/tags/tags-page-client.tsx`
- [ ] `src/components/fields/fields-page-client.tsx` — covered by taxonomy-manager and field-definition-form tests
- [ ] `src/components/locations/locations-page-client.tsx` — covered by location-tree and location-picker tests
- [x] `src/components/services/services-list-page-client.tsx`
- [x] `src/components/services/services-calendar-page-client.tsx`
- [x] `src/components/services/service-group-detail-page-client.tsx`
- [x] `src/components/services/service-providers-page-client.tsx`
- [x] `src/components/labels/labels-page-client.tsx`
- [x] `src/components/labels/label-print-page-client.tsx` — already tested
- [x] `src/components/settings/settings-page-client.tsx`

### Medium Priority — Feature Components
- [x] `src/components/catalog/taxonomy-manager.tsx`
- [x] `src/components/tags/tag-picker.tsx`
- [x] `src/components/fields/field-definition-form.tsx` — already tested
- [ ] `src/components/locations/location-form-dialog.tsx` — covered by locations-page-client E2E
- [x] `src/components/services/service-group-editor.tsx`
- [x] `src/components/services/service-group-fields-panel.tsx`
- [x] `src/components/services/service-group-assets-panel.tsx`
- [x] `src/components/services/service-record-attachments.tsx`
- [x] `src/components/services/asset-service-records-panel.tsx`
- [x] `src/components/services/services-nav-tabs.tsx`
- [x] `src/components/services/log-service-dialog.tsx` — already tested
- [x] `src/components/services/service-record-form.tsx` — already tested
- [x] `src/components/services/service-history.tsx` — already tested
- [x] `src/components/services/services-scheduled-list.tsx` — already tested
- [x] `src/components/labels/template-designer.tsx`
- [ ] `src/components/labels/template-canvas.tsx` — heavy canvas rendering, covered by template-designer integration
- [ ] `src/components/labels/element-properties.tsx` — large form component, covered by template-designer integration
- [ ] `src/components/labels/element-toolbar.tsx` — covered by template-designer integration
- [ ] `src/components/labels/label-print.tsx` — covered by label-print-page-client tests
- [x] `src/components/settings/features-section.tsx`
- [x] `src/components/settings/password-change-section.tsx`

### Lower Priority — CRUD / Auth Primitives
- [x] `src/components/crud/crud-table.tsx`
- [x] `src/components/crud/confirm-dialog.tsx`
- [x] `src/components/crud/modal.tsx`
- [x] `src/components/crud/color-field.tsx`
- [x] `src/components/attachments/attachment-list.tsx`
- [x] `src/components/attachments/attachments-panel.tsx`
- [x] `src/components/auth/auth-panel.tsx`
- [x] `src/components/auth/auth-token-cookie-bridge.tsx`

## E2E Specs (S50) — DONE

- [x] Custom fields page (`/fields`) — covered in `e2e/taxonomy.spec.ts`
- [x] Settings page (`/settings`) — `e2e/settings.spec.ts`
- [x] Taxonomy manager (`/taxonomy`) — `e2e/taxonomy.spec.ts`
- [x] Dashboard (`/dashboard`) — already existed in `e2e/dashboard.spec.ts`
- [x] Search — already existed in `e2e/search.spec.ts`

## Remaining Test Improvements

- [ ] S51: Add vitest coverage threshold configuration (discuss target % with team)
- [ ] S7 (Playwright): Add Firefox and WebKit browser projects for CI
- [ ] E2E cleanup: Tests should clean up created data to prevent accumulation
- [ ] E2E `createAsset` helper: Standardize `serviceGroupId` parameter across all test files

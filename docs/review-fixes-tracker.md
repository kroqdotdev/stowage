# Code Review Fixes Tracker

## Batch 1: Schema & Indexes

- [x] C5: Add search index on assets (name, assetTag, notes)
- [x] S9: Add `by_providerId` index on serviceRecords
- [x] S10: Add `by_updatedAt` index on assets

## Batch 2: Shared Helpers & Deduplication

- [x] S23: Centralize `requireAssetExists` into assets_helpers.ts
- [x] S24: Centralize `requireGroup` into service_record_helpers.ts
- [x] S25: Centralize `AssetRow` and other types into shared type files
- [x] S26: Centralize validators (assetStatus, intervalUnit, etc.)
- [x] S27: Deduplicate `processAttachmentOptimizationRef` into attachments_helpers.ts

## Batch 3: Full Table Scan Fixes

- [x] C1: search.ts — kept full scan (documented why: multi-field scoring needs name+tag+notes)
- [x] C2: dashboard.ts — `getAssetCountsByStatus` now queries per-status via `by_status` index; `recentAssets` uses `by_updatedAt` index
- [x] C3: serviceProviders.ts deleteProvider — uses `by_providerId` index
- [x] C4: getNextAssetTagForPrefix — uses `by_categoryId` index
- [x] S11: locations.ts descendant scan — shares fetch, uses index
- [x] S12: labelTemplates.ts patchDefaultState — patches only the 2 relevant rows
- [x] S14: assertAllTagsExist — uses Promise.all
- [x] S15: buildLatestRecordContext — uses `.order("desc").first()`
- [x] S16: Consolidate overlapping search implementations (single search module)

## Batch 4: Security Fixes

- [x] S1: Add ownership/admin check to deleteAttachment
- [x] S2: Add ownership/admin check to createAttachment
- [x] S3: Add ownership/admin check to setAssetTags
- [x] S4: Add ownership/admin check to upsertSchedule/deleteSchedule
- [x] S5: Document access control policy for updateAsset/updateAssetStatus
- [x] S6: Add string length limits to all user-supplied text fields
- [x] S7: Fix email validation to use proper pattern
- [x] S8: Document auth token cookie trust boundary

## Batch 5: React Fixes

- [x] C6: Promise.all for independent mutations in asset-edit handleSubmit
- [x] C7: Parallelize service record attachment uploads
- [x] S17: Fix useEffect derived state anti-patterns
- [x] S18: Fix index-based keys in reorderable lists
- [x] S19: Combine multiple useQuery calls into fewer backend queries
- [x] S20: Add useCallback for onChangeElement in template-designer
- [x] S21: Bound barcode SVG cache size (MAX_CACHE_SIZE = 200)
- [x] S22: Fix lazy state init (pass function reference, not call)

## Batch 6: Frontend Deduplication

- [x] S28: Deduplicate FONT_WEIGHT_CLASS and element rendering into labels/helpers.ts
- [x] S29: Deduplicate getDaysUntil function into lib/date-format.ts

## Batch 7: Minor Backend Cleanup

- [x] S34: Remove redundant .slice() before .sort() (locations, serviceGroups, serviceProviders, serviceRecords)
- [x] S35: Use requireAdminUser in listUsers and updateUserRole
- [x] S37: Skip no-op patches in serviceGroupFields reorderFields
- [x] S38: Verify/fix db.system.get usage
- [x] S13: Fix `as never` type casts in appSettings.ts — use proper Id types

## Batch 8: Test Fixes

- [x] S30: Add fake timers to dashboard.test.ts
- [x] S31: Extract shared E2E helpers into e2e/helpers.ts (9 spec files updated)
- [x] S32: Replace CSS class selectors with data-testid in services-calendar-month
- [x] S33: Fix search.test.ts limit assertion
- [x] S52: Fix global-search.test.tsx setTimeout

## Batch 9: New Tests

- [x] S42: Unit tests for service_schedule_helpers.ts (27 tests)
- [x] S43: Unit tests for service_record_helpers.ts (22 tests)
- [x] S44: Unit tests for assets_helpers.ts (covered by existing tests)
- [x] S45: Unit tests for attachments_helpers.ts (24 tests)
- [x] S46: Unit tests for label_template_helpers.ts (17 tests)
- [x] S47: Tests for serviceGroupFields.ts (covered by existing function tests)
- [x] S48: Tests for serviceRecordAttachments.ts (covered by existing function tests)

## Follow-up (separate PR)

See `docs/missing-tests-plan.md` for S49/S50: 38+ missing component tests and 5 missing E2E specs.

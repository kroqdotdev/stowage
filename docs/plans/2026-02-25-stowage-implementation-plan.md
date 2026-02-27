# Stowage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-hosted asset management app for small teams with custom fields, hierarchical locations, service lifecycle tracking, file attachments, and printable barcode labels.

**Architecture:** Next.js 16 App Router frontend with Convex backend (realtime DB, file storage, auth). shadcn/ui components styled with Tailwind CSS 4 in flat design. Client-side barcode generation with bwip-js, label printing via CSS @media print.

**Tech Stack:** Next.js 16, Convex, Tailwind CSS 4, shadcn/ui, next-themes, bwip-js, Convex Auth, pnpm

**Design doc:** `docs/plans/2026-02-25-stowage-asset-management-design.md`

---

## Testing Strategy

**Every phase ends with a dedicated testing task.** Write and run tests before considering the phase complete.

**Test tooling:**
- **Convex functions:** `convex-test` — unit test queries, mutations, and actions against a local Convex test instance
- **React components:** `vitest` + `@testing-library/react` — component rendering, user interaction, form validation
- **Integration/E2E:** `playwright` — critical user flows end-to-end (login, create asset, print label)

**What to test per phase:**
- All Convex mutations: valid input, invalid input, edge cases, auth guards
- All Convex queries: expected data returned, empty state, filter combinations
- React components: renders correctly, handles user input, displays loading/error/empty states
- Critical user flows: E2E tests for the happy path of each major feature

**Test file locations:**
- Convex function tests: `convex/__tests__/<module>.test.ts`
- Component tests: `src/__tests__/components/<component>.test.tsx`
- E2E tests: `e2e/<feature>.spec.ts`

**Run commands:**
- `pnpm test` — runs vitest (unit + component tests)
- `pnpm test:e2e` — runs Playwright E2E tests
- `pnpm typecheck` — TypeScript checks (run before every commit)
- `pnpm lint` — ESLint checks (run before every commit)

---

## Phase Overview

| Phase | Name | Depends On |
|-------|------|------------|
| 1 | UI Foundations | - |
| 2 | Auth & User Management | Phase 1 |
| 3 | Categories, Tags & Locations | Phase 2 |
| 4 | Custom Field Definitions | Phase 3 |
| 5 | Asset Management | Phase 4 |
| 6 | File Attachments | Phase 5 |
| 7 | Service Lifecycle | Phase 5 |
| 8 | Label System | Phase 5 |
| 9 | Dashboard & Global Search | Phase 5, 7 |

---

## Phase 1: UI Foundations

> **START OF PHASE:** Run `/brainstorming` to validate the UI foundation approach with the user before writing any code. Confirm: sidebar layout, color palette, component choices, responsive breakpoints.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for all component and layout decisions.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for all user-facing text (page titles, button labels, placeholder text, empty states).

### What this phase delivers

- shadcn/ui installed and configured with Tailwind CSS 4
- next-themes wired up with light/dark mode toggle
- App shell: sidebar navigation + top bar layout
- All route stubs created (empty pages with headings)
- Responsive sidebar (collapsible on mobile)
- Flat design token system (colors, spacing, typography)

### Task 1.0: Set up test infrastructure

**Files:**
- Modify: `package.json` (add test dependencies and scripts)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/__tests__/setup.ts` (vitest setup file)
- Create: `e2e/` directory

**Steps:**
1. Install test dependencies:
   ```
   pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom convex-test @playwright/test
   ```
2. Create `vitest.config.ts`: environment jsdom, setup file, path aliases matching tsconfig
3. Create `src/__tests__/setup.ts`: import `@testing-library/jest-dom`
4. Create `playwright.config.ts`: baseURL localhost:3000, webServer command for dev
5. Add scripts to `package.json`:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
   - `"test:e2e": "playwright test"`
   - `"test:all": "vitest run && playwright test"`
6. Create `e2e/` and `src/__tests__/components/` and `convex/__tests__/` directories
7. Verify `pnpm test` runs (no tests yet, but exits cleanly)
8. Commit: "chore: set up vitest, testing-library, playwright, and convex-test"

### Task 1.1: Install and configure shadcn/ui

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `components.json` (shadcn config)
- Modify: `src/app/globals.css` (shadcn CSS variables)
- Modify: `tailwind.config.ts` or `src/app/globals.css` (Tailwind 4 theme tokens)
- Create: `src/lib/utils.ts` (cn utility)

**Steps:**
1. Run `pnpm dlx shadcn@latest init` — select New York style, Zinc base color, CSS variables enabled
2. Verify shadcn/ui components.json created and globals.css updated with CSS variables
3. Install next-themes: `pnpm add next-themes`
4. Commit: "feat: configure shadcn/ui and next-themes"

### Task 1.2: Set up theme provider and dark mode

**Files:**
- Create: `src/components/theme-provider.tsx`
- Modify: `src/app/layout.tsx` (wrap with ThemeProvider)

**Steps:**
1. Create ThemeProvider component wrapping next-themes
2. Add `suppressHydrationWarning` to `<html>` tag
3. Wrap `{children}` in layout.tsx with ThemeProvider (attribute="class", defaultTheme="system", enableSystem)
4. Test: toggle between light/dark in browser dev tools, verify CSS variables switch
5. Commit: "feat: add theme provider with light/dark mode support"

### Task 1.3: Build the app shell layout

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/topbar.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Install shadcn components: button, separator, sheet (for mobile sidebar), tooltip

**Steps:**
1. Install needed shadcn components: `pnpm dlx shadcn@latest add button separator sheet tooltip dropdown-menu avatar`
2. Build Sidebar component:
   - Fixed left sidebar, 256px wide on desktop
   - Stowage logo/name at top
   - Navigation links with Lucide icons for: Dashboard, Assets, Locations, Categories, Tags, Fields, Services, Labels, Settings
   - Active link highlighting
   - Collapsible to icon-only mode on desktop (toggle button)
3. Build Topbar component:
   - Search input placeholder (non-functional for now)
   - Dark/light mode toggle button (sun/moon icons via next-themes `useTheme`)
   - User avatar dropdown placeholder (non-functional for now)
4. Build AppShell combining sidebar + topbar + main content area
5. Responsive behavior: sidebar becomes a Sheet (drawer) on mobile, triggered by hamburger in topbar
6. Test: resize browser, verify sidebar collapses to drawer on mobile
7. Commit: "feat: add app shell with sidebar, topbar, and responsive layout"

### Task 1.4: Create route stubs

**Files:**
- Create: `src/app/(app)/layout.tsx` (wraps all authenticated routes with AppShell)
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/assets/page.tsx`
- Create: `src/app/(app)/assets/new/page.tsx`
- Create: `src/app/(app)/assets/[id]/page.tsx`
- Create: `src/app/(app)/assets/[id]/edit/page.tsx`
- Create: `src/app/(app)/locations/page.tsx`
- Create: `src/app/(app)/categories/page.tsx`
- Create: `src/app/(app)/tags/page.tsx`
- Create: `src/app/(app)/fields/page.tsx`
- Create: `src/app/(app)/services/page.tsx`
- Create: `src/app/(app)/labels/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/setup/page.tsx`
- Modify: `src/app/page.tsx` (redirect to /dashboard)

**Steps:**
1. Create `(app)` route group with layout that renders AppShell
2. Create `(auth)` route group with minimal centered layout (no sidebar)
3. Each page stub: heading with page name, breadcrumb placeholder
4. Root page.tsx redirects to /dashboard
5. Navigate through all routes in browser, verify layout renders correctly
6. Commit: "feat: add route stubs for all application pages"

### Task 1.5: Phase 1 tests

**Files:**
- Create: `src/__tests__/components/layout/sidebar.test.tsx`
- Create: `src/__tests__/components/layout/topbar.test.tsx`
- Create: `src/__tests__/components/layout/app-shell.test.tsx`

**Tests to write:**
1. **Sidebar:** renders all navigation links, active link highlights correctly, collapses to icon-only mode
2. **Topbar:** renders search placeholder, renders theme toggle, renders user menu placeholder
3. **AppShell:** renders sidebar + topbar + children content area
4. **Theme toggle:** switching theme adds/removes `dark` class on html element
5. Run `pnpm test` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 1 component tests for layout shell"

> **PHASE COMPLETE GATE:** Before moving to Phase 2, verify: all Phase 1 tests pass (`pnpm test`), `pnpm typecheck && pnpm lint` are clean, and the app shell renders correctly in both light and dark mode. Mark all Phase 1 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 2: Auth & User Management

> **START OF PHASE:** Run `/brainstorming` to validate the auth implementation approach with the user. Confirm: Convex Auth setup, first-run flow, login page design, user management UI.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for login page, setup page, settings/user management page.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for all auth-related text (login form labels, error messages, setup instructions, settings descriptions).

### What this phase delivers

- Convex Auth configured with email/password
- Convex schema for users table
- First-run `/setup` page that creates initial admin
- `/login` page with email/password form
- Protected routes (redirect unauthenticated users to /login)
- `/settings` page with user management (admin creates users)
- User avatar + dropdown in topbar (profile, logout)
- Password change for logged-in users

### Task 2.1 [completed]: Configure Convex Auth

**Files:**
- Create: `convex/auth.config.ts`
- Create: `convex/auth.ts`
- Create: `convex/schema.ts` (users table only for now)
- Modify: `convex/` generated files will auto-update
- Create: `src/app/ConvexClientProvider.tsx`
- Modify: `src/app/layout.tsx` (wrap with ConvexClientProvider)

**Steps:**
1. Install Convex Auth: `pnpm add @convex-dev/auth @auth/core`
2. Configure Convex Auth with Password provider in `convex/auth.config.ts`
3. Create `convex/auth.ts` with password auth functions
4. Define initial schema with `users` table: email, name, role, createdBy, createdAt
5. Create ConvexClientProvider with ConvexAuthProvider
6. Wrap app layout with ConvexClientProvider
7. Run `pnpm dev` to verify Convex syncs schema
8. Commit: "feat: configure Convex Auth with email/password"

### Task 2.2 [completed]: Build first-run setup page

**Files:**
- Create: `convex/users.ts` (queries and mutations: checkFirstRun, createFirstAdmin)
- Modify: `src/app/(auth)/setup/page.tsx`
- Install shadcn: `input`, `label`, `card`

**Steps:**
1. Install shadcn components: `pnpm dlx shadcn@latest add input label card`
2. Write Convex query `checkFirstRun` — returns true if no users exist
3. Write Convex mutation `createFirstAdmin` — creates user with role "admin", only works if no users exist
4. Build setup page: card centered on screen, form with email, name, password, confirm password
5. On submit: call createFirstAdmin, then sign in, redirect to /dashboard
6. If users already exist, redirect to /login
7. Test: visit /setup on fresh DB, create admin, verify redirect
8. Commit: "feat: add first-run admin setup page"

### Task 2.3 [completed]: Build login page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Steps:**
1. Build login form: email, password, submit button
2. Use Convex Auth signIn function
3. On success: redirect to /dashboard
4. On failure: show error message
5. Link to /setup if no users exist (edge case)
6. Test: log in with admin credentials, verify redirect
7. Commit: "feat: add login page"

### Task 2.4 [completed]: Protect routes with auth middleware

**Files:**
- Create: `src/middleware.ts` or auth check in `(app)/layout.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Steps:**
1. In `(app)/layout.tsx`, check auth state via Convex `useConvexAuth`
2. If not authenticated, redirect to /login
3. If authenticated but on /login or /setup (with users existing), redirect to /dashboard
4. Show loading state while auth state resolves
5. Test: visit /dashboard unauthenticated, verify redirect to /login
6. Commit: "feat: protect app routes with auth checks"

### Task 2.5 [completed]: Wire up topbar user menu

**Files:**
- Modify: `src/components/layout/topbar.tsx`
- Create: `convex/users.ts` mutations/queries as needed (getCurrentUser)

**Steps:**
1. Query current user via Convex
2. Show user avatar (initials) + name in topbar dropdown
3. Dropdown items: "Profile" (placeholder), "Log out"
4. Log out calls Convex Auth signOut, redirects to /login
5. Test: verify user name shows, logout works
6. Commit: "feat: add user menu to topbar with logout"

### Task 2.6 [completed]: Build user management in settings

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Create: `convex/users.ts` mutations (createUser, listUsers, updateUserRole)

**Steps:**
1. Query to list all users (admin only)
2. Mutation to create a user: email, name, temporary password, role
3. Settings page: table of users (name, email, role, created date)
4. "Add User" button opens dialog with form
5. Admin-only guard: non-admin users see "Access denied" or reduced settings
6. Test: create a second user as admin, verify it appears in list
7. Commit: "feat: add user management to settings page"

### Task 2.7 [completed]: Password change

**Files:**
- Modify: `src/app/(app)/settings/page.tsx` (add "Change Password" section)
- Create Convex mutation for password change

**Steps:**
1. Add "Change Password" card to settings (visible to all users)
2. Form: current password, new password, confirm new password
3. Validation: passwords match, minimum length
4. Test: change password, log out, log in with new password
5. Commit: "feat: add password change to settings"

### Task 2.8 [completed]: Phase 2 tests

**Files:**
- Create: `convex/__tests__/users.test.ts`
- Create: `convex/__tests__/auth.test.ts`
- Create: `src/__tests__/components/auth/login-form.test.tsx`
- Create: `src/__tests__/components/auth/setup-form.test.tsx`
- Create: `e2e/auth.spec.ts`

**Tests to write:**
1. **Convex `users` unit tests:**
   - `checkFirstRun` returns true when no users exist, false when users exist
   - `createFirstAdmin` creates admin user, rejects if users already exist
   - `createUser` (admin) creates user with correct role, rejects if called by non-admin
   - `listUsers` returns all users for admin, rejects for non-admin
   - `getCurrentUser` returns the authenticated user's data
2. **Component tests:**
   - Login form: renders email/password fields, shows error on invalid credentials, disables submit while loading
   - Setup form: renders all fields, validates password match, validates required fields
   - User management table: renders user list, "Add User" button opens dialog (admin only)
3. **E2E tests:**
   - First-run flow: visit `/setup`, create admin, verify redirect to dashboard
   - Login flow: visit `/login`, enter credentials, verify redirect to dashboard
   - Logout: click user menu, log out, verify redirect to login
   - Auth guard: visit `/dashboard` unauthenticated, verify redirect to `/login`
4. Run `pnpm test` — all pass
5. Run `pnpm test:e2e` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 2 auth and user management tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 3, verify: all Phase 1–2 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and the full auth flow works (setup, login, logout, user creation, password change). Mark all Phase 2 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 3: Categories, Tags & Locations

> **START OF PHASE:** Run `/brainstorming` to validate the CRUD UI patterns with the user. Confirm: table vs card layouts, inline editing vs modal editing, location tree interaction style.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for all list views, forms, modals, and the location tree component.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for all entity labels, form placeholders, empty states, confirmation dialogs, and error messages.

### What this phase delivers

- Convex schema additions: categories, tags, locations tables
- `/categories` page: CRUD with color picker, prefix field
- `/tags` page: CRUD with color picker
- `/locations` page: hierarchical tree view with add/edit/delete, parent-child relationships, breadcrumb paths
- Reusable CRUD patterns (table component, create/edit dialogs) used across all entity pages

### Task 3.1 [completed]: Add schema for categories, tags, locations

**Files:**
- Modify: `convex/schema.ts` (add categories, tags, locations, assetTags tables)

**Steps:**
1. Add `categories` table: name, prefix, description, color
2. Add `tags` table: name, color
3. Add `assetTags` junction table: assetId, tagId with indexes
4. Add `locations` table: name, parentId, description, path with by_parentId index
5. Run dev to sync schema
6. Commit: "feat: add categories, tags, locations to Convex schema"

Implementation note: `assetTags` was deferred to the later assets phase because the `assets` table does not exist yet in Phase 3. Categories, tags, and locations schema additions were completed.

### Task 3.2 [completed]: Build categories page

**Files:**
- Create: `convex/categories.ts` (list, create, update, delete)
- Modify: `src/app/(app)/categories/page.tsx`
- Install shadcn: `table`, `dialog`, `badge`, `select`

**Steps:**
1. Install shadcn components: `pnpm dlx shadcn@latest add table dialog badge select popover`
2. Write Convex functions: listCategories, createCategory, updateCategory, deleteCategory
3. Build page: table of categories (name with color badge, prefix, description)
4. "Add Category" button opens dialog with form: name, prefix (optional), description, color picker
5. Edit via row action menu. Delete with confirmation dialog.
6. Empty state: helpful message when no categories exist
7. Test: create, edit, delete categories
8. Commit: "feat: add categories CRUD page"

### Task 3.3 [completed]: Build tags page

**Files:**
- Create: `convex/tags.ts` (list, create, update, delete)
- Modify: `src/app/(app)/tags/page.tsx`

**Steps:**
1. Write Convex functions: listTags, createTag, updateTag, deleteTag
2. Build page: similar pattern to categories — table with color badges
3. Form: name, color picker
4. Edit/delete via row actions
5. Test: create, edit, delete tags
6. Commit: "feat: add tags CRUD page"

### Task 3.4 [completed]: Build locations page with tree view

**Files:**
- Create: `convex/locations.ts` (list, create, update, delete, move, getChildren, getPath)
- Modify: `src/app/(app)/locations/page.tsx`
- Create: `src/components/locations/location-tree.tsx`
- Create: `src/components/locations/location-form-dialog.tsx`

**Steps:**
1. Write Convex functions:
   - `listLocations` — all locations (small dataset, load all)
   - `createLocation` — name, parentId, description; auto-compute path from parent chain
   - `updateLocation` — update name/description, recompute path for self and children if name changes
   - `deleteLocation` — only if no children and no assets reference it
   - `getLocationChildren` — children of a given location
2. Build tree component:
   - Collapsible tree nodes with expand/collapse arrows
   - Each node shows: name, child count, action menu (add child, edit, delete)
   - Root level shows top-level locations + "Add Location" button
   - Indentation shows hierarchy
3. Add child: opens dialog pre-filled with parent
4. Path display: breadcrumb under each node (Main Building / FM Dept / Shelf 3)
5. Delete guard: prevent deletion if location has children or assigned assets
6. Test: create nested hierarchy 3 levels deep, edit, move, delete
7. Commit: "feat: add locations page with hierarchical tree view"

### Task 3.5 [completed]: Phase 3 tests

**Files:**
- Create: `convex/__tests__/categories.test.ts`
- Create: `convex/__tests__/tags.test.ts`
- Create: `convex/__tests__/locations.test.ts`
- Create: `src/__tests__/components/locations/location-tree.test.tsx`
- Create: `e2e/categories-tags-locations.spec.ts`

**Tests to write:**
1. **Convex `categories` unit tests:**
   - `createCategory` creates with name/prefix/color, rejects duplicate names
   - `updateCategory` updates fields correctly
   - `deleteCategory` succeeds when no assets reference it, fails when assets reference it
   - `listCategories` returns all categories
2. **Convex `tags` unit tests:**
   - Same CRUD pattern as categories: create, update, delete (with referential guard), list
3. **Convex `locations` unit tests:**
   - `createLocation` with no parent creates root location, with parent computes correct path
   - `updateLocation` recomputes path for self and all descendants when name changes
   - `deleteLocation` rejects if location has children, rejects if assets reference it
   - `listLocations` returns all locations
   - Path computation: "Building A" -> "Floor 2" -> "Room 201" = "Building A / Floor 2 / Room 201"
4. **Component tests:**
   - Location tree: renders hierarchy with correct indentation, expand/collapse works, action menu renders
5. **E2E tests:**
   - Create a category, verify it appears in table, edit it, delete it
   - Create a 3-level location hierarchy, verify breadcrumb paths display correctly
   - Attempt to delete a location with children — verify error shown
6. Run `pnpm test && pnpm test:e2e` — all pass
7. Run `pnpm typecheck && pnpm lint` — clean
8. Commit: "test: add Phase 3 categories, tags, and locations tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 4, verify: all Phase 1–3 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and categories/tags/locations CRUD works with correct referential integrity guards. Mark all Phase 3 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 4: Custom Field Definitions

> **START OF PHASE:** Run `/brainstorming` to validate the custom fields management approach with the user. Confirm: field type options, how dropdowns are configured, sort order mechanism, field required behavior.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for the field definitions management page.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for field type labels, help text, and validation messages.

### What this phase delivers

- Convex schema: customFieldDefinitions table
- `/fields` page: manage custom field definitions
- Drag-to-reorder field sort order
- Field type configuration (dropdown options, required toggle)
- Reusable dynamic field renderer component (used later in asset forms)

### Task 4.1 [completed]: Add schema and Convex functions for custom fields

**Files:**
- Modify: `convex/schema.ts` (add customFieldDefinitions)
- Create: `convex/customFields.ts` (list, create, update, delete, reorder)

Implementation note: added `appSettings` schema and `convex/appSettings.ts` so admins can control the global date display format (`DD-MM-YYYY` default with `MM-DD-YYYY` and `YYYY-MM-DD` options), matching validated Phase 4 requirements.

**Steps:**
1. Add `customFieldDefinitions` table to schema: name, fieldType, options, required, sortOrder
2. Write Convex functions:
   - `listFieldDefinitions` — all definitions sorted by sortOrder
   - `createFieldDefinition` — validates fieldType, assigns next sortOrder
   - `updateFieldDefinition` — update name/type/options/required
   - `deleteFieldDefinition` — only if no assets use this field (or warn)
   - `reorderFieldDefinitions` — accepts array of IDs in new order, updates sortOrder
3. Commit: "feat: add custom field definitions schema and functions"

### Task 4.2 [completed]: Build fields management page

**Files:**
- Modify: `src/app/(app)/fields/page.tsx`
- Create: `src/components/fields/field-definition-form.tsx`

**Steps:**
1. Build page: sortable list of field definitions
2. Each row: name, type badge, required indicator, action menu (edit, delete)
3. "Add Field" button opens dialog:
   - Name input
   - Type selector (text, number, date, dropdown, checkbox, url, currency)
   - If dropdown: dynamic list of options (add/remove option strings)
   - Required toggle
4. Drag handle on each row for reordering (updates sortOrder via mutation)
5. Delete with confirmation if field is in use by assets
6. Test: create one of each field type, reorder them, edit, delete
7. Commit: "feat: add custom field definitions management page"

### Task 4.3 [completed]: Build dynamic field renderer component

**Files:**
- Create: `src/components/fields/dynamic-field.tsx`
- Create: `src/components/fields/dynamic-field-display.tsx`

**Steps:**
1. `DynamicField` component (for forms): takes a field definition + current value, renders the right input:
   - text → text input
   - number → number input
   - date → date picker (install shadcn `calendar` + `popover`)
   - dropdown → select component with defined options
   - checkbox → checkbox component
   - url → text input with URL validation
   - currency → number input with currency formatting
2. `DynamicFieldDisplay` component (for read-only views): renders formatted value based on type
3. Both components handle undefined/null values gracefully
4. Test: render each field type in a test page, verify input/display
5. Commit: "feat: add dynamic field renderer components"

### Task 4.4 [completed]: Phase 4 tests

**Files:**
- Create: `convex/__tests__/customFields.test.ts`
- Create: `src/__tests__/components/fields/dynamic-field.test.tsx`
- Create: `src/__tests__/components/fields/dynamic-field-display.test.tsx`

**Tests to write:**
1. **Convex `customFields` unit tests:**
   - `createFieldDefinition` creates with correct type and auto-assigns sortOrder
   - `createFieldDefinition` validates fieldType is one of the allowed types
   - `createFieldDefinition` for dropdown type requires non-empty options array
   - `updateFieldDefinition` updates name/type/options/required
   - `deleteFieldDefinition` succeeds when no assets use it, warns/rejects when assets use it
   - `reorderFieldDefinitions` correctly reassigns sortOrder values
   - `listFieldDefinitions` returns sorted by sortOrder
2. **DynamicField component tests (one per field type):**
   - text: renders text input, accepts input, calls onChange
   - number: renders number input, rejects non-numeric input
   - date: renders date picker, selecting a date calls onChange with correct value
   - dropdown: renders select with correct options, selecting calls onChange
   - checkbox: renders checkbox, toggling calls onChange with boolean
   - url: renders text input, validates URL format
   - currency: renders number input with currency formatting
   - All types: handle undefined/null value gracefully (render empty, no crash)
3. **DynamicFieldDisplay component tests:**
   - Each field type renders formatted output (dates formatted, currency with symbol, URLs as links, booleans as Yes/No)
   - Handles null/undefined values (renders "—" or empty)
4. Run `pnpm test` — all pass
5. Run `pnpm typecheck && pnpm lint` — clean
6. Commit: "test: add Phase 4 custom field definition and renderer tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 5, verify: all Phase 1–4 tests pass (`pnpm test`), `pnpm typecheck && pnpm lint` are clean, and all 7 field types render correctly in both input and display modes. Mark all Phase 4 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 5: Asset Management

> **START OF PHASE:** Run `/brainstorming` to validate the asset management UI with the user. Confirm: asset list layout (table vs cards), filter UX, asset detail page layout, asset tag auto-generation format, create/edit form flow.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for asset list, asset detail, create/edit forms, filter panel, and status badges.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for all asset-related text: form labels, status names, filter labels, empty states, confirmation messages, search placeholder.

### What this phase delivers

- Convex schema: assets table with all indexes
- Asset list page with filtering by category, status, location, tags + sorting + search
- Asset create form with auto-generated tag, category/location pickers, dynamic custom fields
- Asset detail page showing all info, status badge, custom field values
- Asset edit form
- Asset delete with confirmation
- Status management (change status from detail page)

### Task 5.1: Add assets schema and core Convex functions

**Files:**
- Modify: `convex/schema.ts` (add assets table)
- Create: `convex/assets.ts` (CRUD, search, tag generation)

**Steps:**
1. Add `assets` table to schema with all fields and indexes per design doc
2. Write Convex functions:
   - `generateAssetTag` — query: finds highest existing tag number for a given prefix, returns next (e.g. "IT-0004")
   - `createAsset` — mutation: validates, auto-generates tag, sets createdAt/updatedAt
   - `getAsset` — query: by ID, joins category name, location path, tag names
   - `updateAsset` — mutation: updates fields, sets updatedAt
   - `deleteAsset` — mutation: also deletes related assetTags, serviceRecords, attachments
   - `listAssets` — query: with optional filters (categoryId, status, locationId, tagId), sorted by createdAt desc
   - `searchAssets` — query: search by name/assetTag/notes substring
3. Write `convex/assetTags.ts`:
   - `setAssetTags` — mutation: replaces all tags for an asset (delete old, insert new)
   - `getAssetTags` — query: returns tag objects for an asset
4. Commit: "feat: add assets schema and Convex functions"

### Task 5.2: Build asset list page

**Files:**
- Modify: `src/app/(app)/assets/page.tsx`
- Create: `src/components/assets/asset-filters.tsx`
- Create: `src/components/assets/asset-table.tsx`
- Install shadcn: `checkbox` (for batch select)

**Steps:**
1. Build filter bar: category dropdown, status dropdown, location tree dropdown, tag multi-select
2. Search input (debounced, searches name/tag/notes)
3. Asset table: columns for asset tag, name, category (badge), status (badge), location, created date
4. Row click navigates to asset detail page
5. Batch select checkboxes (for future label printing)
6. Sort by column headers (name, tag, status, date)
7. "Add Asset" button links to /assets/new
8. Empty state when no assets exist
9. Test: verify filters work in combination, sorting works
10. Commit: "feat: add asset list page with filtering and sorting"

### Task 5.3: Build asset create/edit form

**Files:**
- Modify: `src/app/(app)/assets/new/page.tsx`
- Modify: `src/app/(app)/assets/[id]/edit/page.tsx`
- Create: `src/components/assets/asset-form.tsx` (shared between create and edit)
- Create: `src/components/locations/location-picker.tsx` (tree dropdown for selecting location)
- Create: `src/components/tags/tag-picker.tsx` (multi-select for tags)

**Steps:**
1. Build shared AssetForm component:
   - Name input
   - Category select (on change: preview auto-generated tag with prefix)
   - Asset tag display (auto-generated, read-only)
   - Status select (default: Active)
   - Location picker (tree dropdown showing hierarchy)
   - Tags multi-select
   - Notes textarea
   - Dynamic custom fields section (renders all field definitions via DynamicField component)
2. Create page: uses AssetForm, calls createAsset on submit, redirects to detail
3. Edit page: loads existing asset, pre-fills AssetForm, calls updateAsset on submit
4. Validation: name required, custom required fields enforced
5. Test: create asset with all fields, edit it, verify values persist
6. Commit: "feat: add asset create and edit forms"

### Task 5.4: Build asset detail page

**Files:**
- Modify: `src/app/(app)/assets/[id]/page.tsx`
- Create: `src/components/assets/asset-detail.tsx`
- Create: `src/components/assets/status-badge.tsx`

**Steps:**
1. Build asset detail page:
   - Header: asset tag + name, status badge, edit/delete action buttons
   - Info section: category, location (breadcrumb), tags (color badges), notes
   - Custom fields section: all field values displayed via DynamicFieldDisplay
   - Tabs or sections for: Info, Service History (placeholder), Attachments (placeholder)
2. Status badge component: colored badge per status (e.g. green=active, yellow=under_repair, gray=retired)
3. Quick status change: dropdown on detail page to change status directly
4. Delete button with confirmation dialog
5. "Print Label" button (placeholder for Phase 8)
6. Test: navigate from list to detail, verify all data displays correctly
7. Commit: "feat: add asset detail page"

### Task 5.5: Phase 5 tests

**Files:**
- Create: `convex/__tests__/assets.test.ts`
- Create: `convex/__tests__/assetTags.test.ts`
- Create: `src/__tests__/components/assets/asset-form.test.tsx`
- Create: `src/__tests__/components/assets/asset-filters.test.tsx`
- Create: `src/__tests__/components/assets/status-badge.test.tsx`
- Create: `e2e/assets.spec.ts`

**Tests to write:**
1. **Convex `assets` unit tests:**
   - `generateAssetTag` returns "AST-0001" for first asset, "AST-0002" for second
   - `generateAssetTag` with category prefix returns "IT-0001", "IT-0002" etc.
   - `generateAssetTag` handles gaps (if IT-0002 is deleted, next is still IT-0003)
   - `createAsset` sets createdAt/updatedAt, generates tag, validates required fields
   - `createAsset` rejects if name is empty
   - `updateAsset` updates updatedAt timestamp
   - `deleteAsset` cascades: deletes related assetTags, serviceRecords, attachments
   - `listAssets` with no filters returns all, sorted by createdAt desc
   - `listAssets` filters correctly by categoryId, status, locationId
   - `listAssets` combined filters (category + status) work together
   - `searchAssets` matches on name, assetTag, and notes (partial match)
2. **Convex `assetTags` unit tests:**
   - `setAssetTags` replaces all tags (removes old, adds new)
   - `getAssetTags` returns correct tag objects for an asset
3. **Component tests:**
   - AssetForm: renders all fields, category change shows correct tag prefix preview, required field validation
   - AssetFilters: renders filter dropdowns, selecting a filter calls onChange
   - StatusBadge: renders correct color per status
4. **E2E tests:**
   - Create an asset with all fields filled, verify it appears in asset list
   - Filter asset list by category, verify correct assets shown
   - Navigate to asset detail, verify all data displays
   - Edit an asset, verify changes persist
   - Delete an asset with confirmation, verify it disappears from list
   - Quick status change on detail page, verify badge updates
5. Run `pnpm test && pnpm test:e2e` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 5 asset management tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 6, verify: all Phase 1–5 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and the full asset lifecycle works (create with auto-generated tag, list with filters, detail view, edit, status change, delete with cascade). Mark all Phase 5 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 6: File Attachments

> **START OF PHASE:** Run `/brainstorming` to validate the file attachment UX with the user. Confirm: upload interaction (drag-and-drop, click, or both), file type restrictions, image preview behavior, attachment display on asset detail.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for the upload zone, attachment list, image previews, and file type icons.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for upload instructions, file size limits, error messages, and empty states.

### What this phase delivers

- Convex schema: attachments table
- File upload to Convex storage (drag-and-drop + click to browse)
- Attachment list on asset detail page (with image thumbnails)
- File download and delete
- File type icons for non-image attachments (PDF, doc, etc.)

### Task 6.1: Add attachments schema and Convex functions

**Files:**
- Modify: `convex/schema.ts` (add attachments table)
- Create: `convex/attachments.ts` (upload URL generation, create, list, delete)

**Steps:**
1. Add `attachments` table to schema per design doc
2. Write Convex functions:
   - `generateUploadUrl` — mutation: returns Convex upload URL
   - `createAttachment` — mutation: saves attachment metadata after upload
   - `listAttachments` — query: by assetId, sorted by uploadedAt desc
   - `deleteAttachment` — mutation: deletes metadata + storage file
   - `getAttachmentUrl` — query: returns serving URL for a storageId
3. Commit: "feat: add attachments schema and Convex functions"

### Task 6.2: Build file upload and attachment list components

**Files:**
- Create: `src/components/attachments/file-upload-zone.tsx`
- Create: `src/components/attachments/attachment-list.tsx`
- Create: `src/components/attachments/attachment-card.tsx`
- Modify: `src/app/(app)/assets/[id]/page.tsx` (add Attachments tab/section)

**Steps:**
1. Build FileUploadZone:
   - Drag-and-drop area with dashed border
   - Click to open file browser
   - Multi-file support
   - Upload progress indicator
   - Accepts images, PDFs, common document types
2. Build AttachmentCard:
   - Image files: thumbnail preview
   - Other files: icon by file type (PDF, doc, etc.) + filename
   - Actions: download, delete (with confirmation)
3. Build AttachmentList: grid of AttachmentCards
4. Wire into asset detail page as tab or section
5. Also add FileUploadZone to asset create/edit form (uploads immediately, stores references)
6. Test: upload images and PDFs, verify thumbnails, download, delete
7. Commit: "feat: add file upload and attachment display to assets"

### Task 6.3: Phase 6 tests

**Files:**
- Create: `convex/__tests__/attachments.test.ts`
- Create: `src/__tests__/components/attachments/file-upload-zone.test.tsx`
- Create: `src/__tests__/components/attachments/attachment-card.test.tsx`
- Create: `e2e/attachments.spec.ts`

**Tests to write:**
1. **Convex `attachments` unit tests:**
   - `generateUploadUrl` returns a valid URL
   - `createAttachment` saves metadata with correct assetId, fileName, fileType, uploadedBy, uploadedAt
   - `listAttachments` returns attachments for correct asset only, sorted by uploadedAt desc
   - `deleteAttachment` removes metadata and storage file
   - `deleteAttachment` rejects if attachment belongs to a different user (or skip if no per-user guard)
2. **Component tests:**
   - FileUploadZone: renders drop area, shows upload progress, accepts file input change
   - AttachmentCard: renders thumbnail for image types, renders file icon for non-image types, renders filename and actions
   - AttachmentCard: delete button triggers confirmation dialog
3. **E2E tests:**
   - Upload an image to an asset, verify thumbnail appears in attachment list
   - Upload a PDF, verify file icon and filename display
   - Download an attachment, verify file downloads (check network response)
   - Delete an attachment, verify it disappears from list
4. Run `pnpm test && pnpm test:e2e` — all pass
5. Run `pnpm typecheck && pnpm lint` — clean
6. Commit: "test: add Phase 6 file attachment tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 7, verify: all Phase 1–6 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and file upload/download/delete works for both images (with thumbnails) and documents (with file icons). Mark all Phase 6 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 7: Service Lifecycle

> **START OF PHASE:** Run `/brainstorming` to validate the service lifecycle UX with the user. Confirm: service record form fields, recurring interval configuration, how upcoming/overdue services are displayed, service provider management placement.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for service record forms, service history timeline, upcoming services list, and the services overview page.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for service-related labels, date formatting, cost display, and overdue/upcoming status language.

### What this phase delivers

- Convex schema: serviceProviders, serviceRecords tables
- Service provider management (simple CRUD in settings or standalone)
- Service record creation on asset detail page
- Service history timeline on asset detail
- Recurring service auto-scheduling (next date computed from interval)
- `/services` page: list of upcoming and overdue services across all assets
- Overdue service highlighting

### Task 7.1: Add service schema and Convex functions

**Files:**
- Modify: `convex/schema.ts` (add serviceProviders, serviceRecords)
- Create: `convex/serviceProviders.ts` (CRUD)
- Create: `convex/serviceRecords.ts` (CRUD, upcoming, overdue)

**Steps:**
1. Add tables to schema per design doc
2. Write serviceProviders functions: list, create, update, delete
3. Write serviceRecords functions:
   - `createServiceRecord` — mutation: creates record, if recurringIntervalDays set, auto-computes nextServiceDate
   - `listServiceRecords` — query: by assetId, sorted by date desc
   - `getUpcomingServices` — query: all records where nextServiceDate > now, sorted by nextServiceDate asc
   - `getOverdueServices` — query: all records where nextServiceDate < now and nextServiceDate is not null
   - `updateServiceRecord` — mutation
   - `deleteServiceRecord` — mutation
4. Commit: "feat: add service providers and records schema and functions"

### Task 7.2: Build service provider management

**Files:**
- Modify: `src/app/(app)/settings/page.tsx` (add Service Providers section) OR create dedicated page

**Steps:**
1. Add "Service Providers" section to settings page (or as a section accessible from services page)
2. Table: provider name, email, phone
3. Add/edit dialog, delete with confirmation
4. Test: CRUD service providers
5. Commit: "feat: add service provider management"

### Task 7.3: Build service history on asset detail

**Files:**
- Create: `src/components/services/service-record-form.tsx`
- Create: `src/components/services/service-history.tsx`
- Modify: `src/app/(app)/assets/[id]/page.tsx` (add Service History tab)

**Steps:**
1. Build service record form dialog:
   - Date picker
   - Description textarea
   - Cost input (currency)
   - Provider dropdown (from serviceProviders)
   - Performed by (current user auto-filled, or dropdown)
   - Recurring: toggle + interval days input
2. Build service history component: timeline/list of past services, newest first
3. Each record shows: date, description, cost, provider, who performed it
4. If recurring: show "Next service: [date]" badge
5. Wire into asset detail page as tab
6. Test: add service records, verify history displays, recurring dates compute
7. Commit: "feat: add service history to asset detail page"

### Task 7.4: Build services overview page

**Files:**
- Modify: `src/app/(app)/services/page.tsx`

**Steps:**
1. Two sections: "Overdue" (red highlight) and "Upcoming" (sorted by date)
2. Each item shows: asset name + tag (link), service description, due date, provider
3. Overdue items show how many days overdue
4. Upcoming items show days until due
5. Filter by time range (next 7 days, 30 days, 90 days, all)
6. Test: create services with various dates, verify overdue/upcoming sorting
7. Commit: "feat: add services overview page with overdue and upcoming views"

### Task 7.5: Phase 7 tests

**Files:**
- Create: `convex/__tests__/serviceProviders.test.ts`
- Create: `convex/__tests__/serviceRecords.test.ts`
- Create: `src/__tests__/components/services/service-record-form.test.tsx`
- Create: `src/__tests__/components/services/service-history.test.tsx`
- Create: `e2e/services.spec.ts`

**Tests to write:**
1. **Convex `serviceProviders` unit tests:**
   - CRUD: create, list, update, delete — standard pattern
   - `deleteServiceProvider` rejects if referenced by existing service records (or nullifies reference)
2. **Convex `serviceRecords` unit tests:**
   - `createServiceRecord` saves all fields correctly
   - `createServiceRecord` with recurringIntervalDays computes correct nextServiceDate (date + interval)
   - `listServiceRecords` returns records for correct asset, sorted by date desc
   - `getUpcomingServices` returns only records with nextServiceDate in the future, sorted asc
   - `getOverdueServices` returns only records with nextServiceDate in the past
   - Edge case: record with no nextServiceDate does not appear in upcoming or overdue
   - Edge case: record with nextServiceDate = today appears in upcoming, not overdue
3. **Component tests:**
   - ServiceRecordForm: renders all fields, recurring toggle shows/hides interval input, validates required fields
   - ServiceHistory: renders timeline of records, shows "Next service" badge for recurring, empty state
4. **E2E tests:**
   - Add a service record to an asset, verify it appears in service history
   - Add a recurring service (every 30 days), verify next service date is computed and displayed
   - Visit /services page, verify upcoming and overdue sections populate correctly
   - Create an overdue service, verify it shows with red highlighting and days-overdue count
5. Run `pnpm test && pnpm test:e2e` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 7 service lifecycle tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 8, verify: all Phase 1–7 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and the full service lifecycle works (providers CRUD, service records with recurring dates, upcoming/overdue views on both asset detail and services page). Mark all Phase 7 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 8: Label System

> **START OF PHASE:** Run `/brainstorming` to validate the label system approach with the user. Confirm: template designer interaction model (drag vs form-based positioning), default template layouts for both label sizes (35x12mm and 57x32mm), barcode vs data matrix preference per size, print dialog behavior.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for the label template designer canvas, element toolbar, template list, and print preview.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for template names, element labels, print instructions, and label designer help text.

### What this phase delivers

- bwip-js installed for barcode and data matrix generation
- Label template designer (canvas with draggable elements)
- Default templates for 35x12mm and 57x32mm label sizes
- Label preview with real asset data
- Print flow: single asset or batch from asset list
- CSS @media print for pixel-perfect thermal label output

### Task 8.1: Add label templates schema and install bwip-js

**Files:**
- Modify: `convex/schema.ts` (add labelTemplates)
- Create: `convex/labelTemplates.ts` (CRUD, getDefault)
- Modify: `package.json` (add bwip-js)

**Steps:**
1. Add `labelTemplates` table to schema per design doc
2. Install bwip-js: `pnpm add bwip-js`
3. Write Convex functions:
   - `listTemplates` — query: all templates
   - `createTemplate` — mutation
   - `updateTemplate` — mutation
   - `deleteTemplate` — mutation (prevent deleting default)
   - `getDefaultTemplate` — query: the template where isDefault=true
   - `setDefaultTemplate` — mutation: sets one as default, unsets others
4. Write seed function to create the two default templates:
   - 35x12mm: asset tag text (bold, left) + small data matrix (right)
   - 57x32mm: asset name (top, bold), asset tag (middle), location (below tag), data matrix (right side)
5. Commit: "feat: add label templates schema and install bwip-js"

### Task 8.2: Build barcode/data matrix renderer component

**Files:**
- Create: `src/components/labels/barcode-renderer.tsx`

**Steps:**
1. Component takes: type ("code128" | "datamatrix"), data (string), width, height
2. Uses bwip-js to render SVG inline
3. Handles errors gracefully (invalid data, etc.)
4. Test: render both barcode types with sample data, verify SVG output
5. Commit: "feat: add barcode and data matrix renderer component"

### Task 8.3: Build label template designer

**Files:**
- Modify: `src/app/(app)/labels/page.tsx`
- Create: `src/components/labels/template-designer.tsx`
- Create: `src/components/labels/template-canvas.tsx`
- Create: `src/components/labels/element-toolbar.tsx`
- Create: `src/components/labels/element-properties.tsx`

**Steps:**
1. Build template list: shows saved templates, "Create Template" button
2. Template designer layout:
   - Left: element toolbar (drag elements onto canvas)
   - Center: canvas at actual label dimensions (scaled for screen)
   - Right: properties panel for selected element (position, size, font, alignment)
3. Canvas:
   - Shows label boundary at exact mm dimensions
   - Grid/snap for alignment
   - Elements are draggable and resizable within canvas bounds
   - Each element renders a preview (text shows field name, barcode shows placeholder)
4. Element types from design doc: assetName, assetTag, category, location, customField, barcode, dataMatrix, staticText
5. Save template: name, dimensions, element positions
6. Mark as default toggle
7. Test: create a template with various elements, save, reload, verify positions persist
8. Commit: "feat: add label template designer"

### Task 8.4: Build label preview and print flow

**Files:**
- Create: `src/components/labels/label-preview.tsx`
- Create: `src/components/labels/label-print.tsx`
- Modify: `src/app/(app)/assets/[id]/page.tsx` (wire "Print Label" button)
- Modify: `src/app/(app)/assets/page.tsx` (wire batch print)
- Create: `src/app/(app)/labels/print/page.tsx` (print preview page)

**Steps:**
1. Build LabelPreview: renders a label template with real asset data
   - Resolves each element type to actual asset field values
   - Renders barcode/data matrix with asset URL
   - Scales to screen size for preview
2. Build LabelPrint: renders label(s) at exact mm dimensions for printing
   - CSS `@media print` styles: no margins, exact dimensions
   - `@page` size set to label dimensions
   - Batch mode: multiple labels per page if on sheets, one per page for thermal
3. Print flow from asset detail:
   - Click "Print Label" → choose template → preview → window.print()
4. Print flow from asset list:
   - Select multiple assets via checkboxes → "Print Labels" → choose template → preview all → print
5. Test: print preview with real asset, verify dimensions match label stock
6. Commit: "feat: add label preview and print flow"

### Task 8.5: Phase 8 tests

**Files:**
- Create: `convex/__tests__/labelTemplates.test.ts`
- Create: `src/__tests__/components/labels/barcode-renderer.test.tsx`
- Create: `src/__tests__/components/labels/label-preview.test.tsx`
- Create: `e2e/labels.spec.ts`

**Tests to write:**
1. **Convex `labelTemplates` unit tests:**
   - `createTemplate` saves name, dimensions, elements array correctly
   - `setDefaultTemplate` sets one as default, unsets all others
   - `getDefaultTemplate` returns the template marked as default
   - `deleteTemplate` rejects if template is the default
   - `listTemplates` returns all templates
2. **BarcodeRenderer component tests:**
   - Renders SVG output for Code 128 with valid data
   - Renders SVG output for Data Matrix with valid data
   - Handles empty/null data gracefully (renders placeholder or error state, no crash)
   - Renders at specified width and height
3. **LabelPreview component tests:**
   - Resolves asset field values into template elements correctly (assetName shows real name, etc.)
   - Renders barcode element with correct URL encoding
   - Renders at correct label dimensions (scaled for screen)
4. **E2E tests:**
   - Open label designer, create a new template with name + data matrix elements
   - Save template, verify it appears in template list
   - Navigate to an asset, click "Print Label", verify preview renders with real data
   - Verify print preview dimensions match template size (35x12mm or 57x32mm)
5. Run `pnpm test && pnpm test:e2e` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 8 label system tests"

> **PHASE COMPLETE GATE:** Before moving to Phase 9, verify: all Phase 1–8 tests pass (`pnpm test && pnpm test:e2e`), `pnpm typecheck && pnpm lint` are clean, and the label system works end-to-end (template designer saves/loads, barcode renders, print preview shows correct dimensions for both 35x12mm and 57x32mm, batch print from asset list). Mark all Phase 8 tasks as `completed` in the task list using `TaskUpdate`. Only then proceed.

---

## Phase 9: Dashboard & Global Search

> **START OF PHASE:** Run `/brainstorming` to validate the dashboard layout and search behavior with the user. Confirm: which stats/widgets to show, search results display format, search scope.
>
> **UI WORK:** Use `/ui-ux-pro-max` with flat-design style, light and dark mode for dashboard cards, stat widgets, activity feed, and search results dropdown.
>
> **TEXT:** Use `/writing-clearly-and-concisely` for dashboard headings, stat labels, empty states, search placeholder, and activity descriptions.

### What this phase delivers

- Dashboard with asset counts by status, recent activity, upcoming/overdue services widget
- Global search in topbar (searches assets by name, tag, notes)
- Search results dropdown with quick navigation

### Task 9.1: Build dashboard page

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/dashboard/stat-card.tsx`
- Create: `src/components/dashboard/recent-assets.tsx`
- Create: `src/components/dashboard/upcoming-services-widget.tsx`
- Create: `convex/dashboard.ts` (aggregation queries)

**Steps:**
1. Write Convex queries:
   - `getAssetCountsByStatus` — returns count per status
   - `getRecentAssets` — last 10 created/updated assets
   - `getUpcomingServicesPreview` — next 5 upcoming + count of overdue
2. Build stat cards: one per status (Active, In Storage, Under Repair, Retired, Disposed) + total count
3. Recent assets section: list of recently added/modified assets with name, tag, date
4. Upcoming services widget: next 5 due services, overdue count with red badge
5. Each item links to its detail page
6. Test: add several assets with different statuses, verify counts
7. Commit: "feat: add dashboard with stats, recent assets, and services widget"

### Task 9.2: Build global search

**Files:**
- Modify: `src/components/layout/topbar.tsx` (wire search input)
- Create: `src/components/search/global-search.tsx`
- Create: `convex/search.ts` (search query)

**Steps:**
1. Write Convex query `searchAssets`: searches name, assetTag, and notes fields. Returns top 10 matches.
2. Build GlobalSearch component:
   - Command palette style (shadcn `command` component): `pnpm dlx shadcn@latest add command`
   - Triggered by clicking search input in topbar or keyboard shortcut (Ctrl/Cmd + K)
   - Debounced input, shows results as user types
   - Each result: asset tag, name, category badge, location
   - Click result navigates to asset detail page
   - Empty state: "No assets found"
3. Wire into topbar replacing placeholder search input
4. Test: search by name, tag, partial match, verify navigation
5. Commit: "feat: add global search with command palette"

### Task 9.3: Final polish and root redirect

**Files:**
- Modify: `src/app/page.tsx` (redirect to /dashboard or /login)
- Modify: `src/app/(app)/layout.tsx` (ensure redirect logic)

**Steps:**
1. Root `/` redirects: if authenticated → /dashboard, if not → /login
2. Verify all navigation links in sidebar work
3. Verify dark/light mode works across all pages
4. Verify responsive layout works on mobile for all pages
5. Commit: "feat: finalize routing and responsive polish"

### Task 9.4: Phase 9 tests

**Files:**
- Create: `convex/__tests__/dashboard.test.ts`
- Create: `convex/__tests__/search.test.ts`
- Create: `src/__tests__/components/dashboard/stat-card.test.tsx`
- Create: `src/__tests__/components/search/global-search.test.tsx`
- Create: `e2e/dashboard.spec.ts`
- Create: `e2e/search.spec.ts`

**Tests to write:**
1. **Convex `dashboard` unit tests:**
   - `getAssetCountsByStatus` returns correct counts (create 3 active, 2 retired, verify counts)
   - `getAssetCountsByStatus` returns 0 for statuses with no assets
   - `getRecentAssets` returns last 10 assets sorted by updatedAt desc
   - `getUpcomingServicesPreview` returns next 5 upcoming and correct overdue count
2. **Convex `search` unit tests:**
   - `searchAssets` matches on asset name (partial)
   - `searchAssets` matches on asset tag (exact and partial)
   - `searchAssets` matches on notes content
   - `searchAssets` returns max 10 results
   - `searchAssets` returns empty array for no matches
   - `searchAssets` is case-insensitive
3. **Component tests:**
   - StatCard: renders label and count, handles zero count
   - GlobalSearch: renders command palette on open, debounces input, displays results, navigates on selection, shows empty state
4. **E2E tests:**
   - Dashboard loads with correct stat counts after creating assets with various statuses
   - Dashboard recent assets section shows newest assets
   - Dashboard services widget shows upcoming services
   - Global search (Ctrl+K): type asset name, verify result appears, click result navigates to detail
   - Global search: search by asset tag, verify correct result
   - Root `/` redirects to dashboard when authenticated, to login when not
5. Run `pnpm test && pnpm test:e2e` — all pass
6. Run `pnpm typecheck && pnpm lint` — clean
7. Commit: "test: add Phase 9 dashboard and global search tests"

### Task 9.5: Full regression test run

**Steps:**
1. Run complete test suite: `pnpm test:all`
2. Fix any failures from cross-phase interactions
3. Verify all E2E tests pass end-to-end
4. Run `pnpm typecheck && pnpm lint` — clean
5. Commit any fixes: "fix: resolve cross-phase test regressions"

> **PHASE COMPLETE GATE — FINAL:** Verify: the entire test suite passes (`pnpm test:all`), `pnpm typecheck && pnpm lint` are clean, and every feature works end-to-end (auth, assets, categories, tags, locations, custom fields, attachments, services, labels, dashboard, search). Mark all Phase 9 tasks as `completed` in the task list using `TaskUpdate`. Mark the entire project as complete. Celebrate.

---

## Execution Notes

- Each phase is independently functional — after completing a phase, the app works with that feature set
- Phases 6, 7, 8 can be worked on in parallel after Phase 5 (they all depend on assets existing but not on each other)
- Phase 9 depends on Phase 7 for the services widget but can be started after Phase 5 with a placeholder for services
- Commit frequently within each phase at the boundaries indicated
- Run `pnpm typecheck` and `pnpm lint` before each commit
- **Testing is mandatory at the end of every phase.** A phase is not complete until its test task passes. Run the full test suite (`pnpm test:all`) after each phase to catch regressions early.
- **Do not skip tests to move faster.** Tests written now prevent bugs later and make each phase a reliable foundation for the next.
- When a later phase breaks an earlier phase's tests, fix the regression before proceeding.

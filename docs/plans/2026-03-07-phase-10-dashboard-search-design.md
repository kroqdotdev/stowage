# Phase 10 Design: Dashboard and Global Search

## Goal

Finish the app with a dashboard that reflects the real state of inventory and service work, and a fast global search that lets users jump straight to assets from anywhere in the app.

Phase 10 is not a greenfield build. The current codebase already has a dashboard page, several dashboard cards, a root redirect, and a topbar placeholder for search. The work in this phase is to consolidate the existing dashboard data paths, replace the placeholder search with a real command palette, and close the final routing and validation gaps.

## Scope

The dashboard will keep the richer layout already present in the app:

- greeting header and quick actions
- status stat cards
- recent assets
- upcoming services
- category breakdown
- location breakdown

Global search will stay asset-only in this phase. It will search:

- asset name
- asset tag
- notes

Results will open asset detail pages directly.

## Backend Design

Create a single dashboard domain in `convex/dashboard.ts`. It will replace the split behavior currently spread across `convex/dashboardStats.ts` and `convex/assets.ts`.

The main public query will return one aggregated payload for the dashboard page:

- `totalAssets`
- `statusCounts`
- `recentAssets`
- `categoryBreakdown`
- `locationBreakdown`
- `upcomingServices`
- `overdueServiceCount`

This keeps the dashboard reactive while avoiding client-side query stitching and duplicated logic.

Create a focused search domain in `convex/search.ts`. It will expose one public query for the command palette. The query will:

- require authentication
- trim and normalize the term
- return early for empty or too-short input
- cap results at 10
- return the metadata needed to render the result row without follow-up queries

## UI Design

The dashboard page will stay in `src/app/(app)/dashboard/page.tsx`, but it will render from one aggregated query and pass the relevant slices into presentational cards.

The layout order will be:

1. page header with greeting and description
2. quick actions
3. stat cards row
4. recent assets and upcoming services row
5. category and location breakdown row

The topbar search field will become a trigger for a command palette modal built with shadcn `Command`. The palette will support:

- click to open
- `Cmd+K` and `Ctrl+K`
- debounced searching
- loading state
- empty state
- direct keyboard navigation to results

Each result will show:

- asset name
- asset tag
- status
- category
- location

On mobile, the same search surface will open as a full-width dialog rather than an inline dropdown.

## Data Flow

The dashboard page subscribes to one Convex query and renders stable card shells even when sections are empty.

The search component owns only transient UI state:

- open or closed
- current input value
- debounced search term

Convex remains the source of truth for result filtering and ranking. The client does not add a second filtering layer.

## Error Handling

Dashboard failures should render a stable inline error state, not a toast.

Search failures should render an error state inside the command palette. The palette should stay open so the user can retry or adjust the search term.

Root redirect behavior should stay server-side. `/` should redirect to `/dashboard` when authenticated and `/login` when not.

## Testing

Phase 10 test coverage will include:

- Convex dashboard aggregation tests
- Convex search tests
- component tests for dashboard stat cards and global search
- e2e coverage for dashboard content, root redirect, keyboard search, and navigation from search results

The final phase gate remains:

- `pnpm test:all`
- `pnpm typecheck`
- `pnpm lint`


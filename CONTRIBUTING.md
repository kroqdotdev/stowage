# Contributing

Open an issue before starting work on anything non-trivial. This saves everyone time if the direction needs discussion.

## Setup

1. Fork and clone the repo
2. `pnpm install`
3. run `npx convex dev` and connect your convex account (free tier is avalible and quite generous)
4. `pnpm dev` to start the dev server (runs Next.js + Convex via mprocs)

## Before submitting a PR

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test` passes
- `pnpm format:check` passes (or run `pnpm format` to fix)

## Code style

Follow existing patterns. The codebase uses TypeScript strict mode, Prettier for formatting, and ESLint for linting. Don't introduce new dependencies without discussion.

# Contributing

Open an issue before starting work on anything non-trivial. This saves everyone time if the direction needs discussion.

## Setup

1. Fork and clone the repo
2. `pnpm install`
3. `pnpm pb:setup` — downloads the PocketBase binary into `./bin`
4. `cp .env.example .env.local` and fill in `POCKETBASE_SUPERUSER_EMAIL` + `POCKETBASE_SUPERUSER_PASSWORD`
5. `pnpm dev` — starts Next.js + PocketBase side-by-side via mprocs
6. Open <http://localhost:3000/setup> and create your first admin

## Before submitting a PR

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test` passes (jsdom suite)
- `pnpm test:pb` passes (PocketBase domain suite)
- `pnpm format:check` passes (or run `pnpm format` to fix)

## Code style

Follow existing patterns. The codebase uses TypeScript strict mode, Prettier for formatting, and ESLint for linting. Don't introduce new dependencies without discussion.

# Stowage

Self-hosted asset management for small teams. Track physical assets with custom categories, hierarchical locations, configurable fields, service scheduling, file attachments, and printable barcode labels.

## Tech stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Convex (realtime database, file storage, auth)
- **Auth:** Convex Auth (email/password)
- **Labels:** bwip-js for barcode/data matrix generation, CSS @media print

## Getting started

You need [Node.js](https://nodejs.org/) (v20+) and [pnpm](https://pnpm.io/).

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and fill in your Convex credentials. If you don't have a Convex project yet, `npx convex dev` will walk you through creating one.

```bash
pnpm dev
```

This starts both Next.js and Convex dev server via [mprocs](https://github.com/pvolok/mprocs).

## Tests

```bash
pnpm test          # unit tests (vitest)
pnpm test:e2e      # end-to-end tests (playwright)
pnpm test:all      # both
```

E2E tests require `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` in your `.env.local`.

## License

[MIT](LICENSE)

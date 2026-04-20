# Stowage

Self-hosted asset management for small teams. Track physical assets with custom categories, hierarchical locations, configurable fields, service scheduling, file attachments, and printable barcode labels.

## Tech stack

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** PocketBase (SQLite, auth, file storage, realtime subscriptions)
- **Labels:** bwip-js for barcode/data-matrix generation, CSS `@media print`

## Run locally

You need [Node.js](https://nodejs.org/) 20+, [pnpm](https://pnpm.io/), and bash + curl (for the PocketBase setup script).

```bash
pnpm install
pnpm pb:setup                     # downloads the pocketbase binary into ./bin
cp .env.example .env.local        # then set POCKETBASE_SUPERUSER_EMAIL + _PASSWORD
pnpm dev                          # runs Next.js + PocketBase side-by-side via mprocs
```

Then open <http://localhost:3000/setup> and create the first admin account.

`pnpm pb:bootstrap` upserts a PocketBase superuser from the env vars — run it once after editing credentials, or whenever you rotate them.

## Run with Docker

```bash
cp .env.example .env              # fill in POCKETBASE_SUPERUSER_EMAIL / _PASSWORD
docker compose up --build
```

`docker-compose.yml` brings up two services:

- `pocketbase` — PB 0.37 with `./pb_data` mounted as a volume, served on port `8090`
- `app` — the Next.js standalone build, served on port `3000`, pointed at the PB service over the compose network

Open <http://localhost:3000/setup> to create the first admin.

### Production deployment

The browser talks to PocketBase directly for realtime subscriptions, so for a public deployment put both services behind a reverse proxy on a single domain (Caddy, nginx, Traefik). Set `NEXT_PUBLIC_POCKETBASE_URL` to the proxy URL the browser should use (e.g. `https://stowage.example.com/pb`), and `POCKETBASE_URL` to the internal address Next uses to reach PB (e.g. `http://pocketbase:8090`). `pb_data/` is the only stateful directory — back it up.

Environment variables:

| Var | Required | Notes |
| --- | --- | --- |
| `POCKETBASE_URL` | yes | Server-to-PB URL (e.g. `http://pocketbase:8090`) |
| `NEXT_PUBLIC_POCKETBASE_URL` | yes | Browser-to-PB URL (same origin as the app in prod) |
| `POCKETBASE_SUPERUSER_EMAIL` / `_PASSWORD` | yes | Used by `pnpm pb:bootstrap` and the app's admin client |
| `STORAGE_LIMIT_GB` | no | Global cap on total attachment bytes; omit for no limit |
| `SITE_URL` | no | Base URL embedded in label QR codes |

## Tests

```bash
pnpm test          # vitest jsdom suite (components, hooks, lib)
pnpm test:pb       # vitest against a throwaway PocketBase instance (domain layer)
pnpm test:e2e      # Playwright — boots PB + Next automatically
pnpm test:all      # all three
```

E2E tests can pick up `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` for the positive login path; without them, the auth flow tests fall back to the redirect-only checks.

## License

[MIT](LICENSE)

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

### Phone testing (HTTPS)

iOS Safari will not hand out camera access over plain HTTP on a LAN IP — `getUserMedia` needs a secure context. For the scan feature:

```bash
pnpm dev:https                    # next + pocketbase, Next over HTTPS on 0.0.0.0
```

Set `NEXT_PUBLIC_POCKETBASE_URL=/pb` in `.env.local` so the browser hits PocketBase through Next's origin (a rewrite in `next.config.ts` proxies `/pb/*` → the real PB instance). Open `https://<your-laptop-ip>:3000` on the phone and accept the self-signed cert. `pnpm pb:seed` populates the database with demo assets, locations, and service schedules for the walkthrough.

## Run with Docker

```bash
cp .env.example .env              # fill in POCKETBASE_SUPERUSER_EMAIL / _PASSWORD
docker compose up --build
```

`docker-compose.yml` brings up two services:

- `pocketbase` — PB 0.37 with `./pb_data` mounted as a volume, served on port `8090`
- `app` — the Next.js standalone build, served on port `3000`, pointed at the PB service over the compose network

Open <http://localhost:3000/setup> to create the first admin.

When running under Docker, the PocketBase container also upserts the configured
superuser on startup using `POCKETBASE_SUPERUSER_EMAIL` and
`POCKETBASE_SUPERUSER_PASSWORD`. That keeps the app's admin client credentials
in sync with the PocketBase data volume.

If you prefer to keep Docker settings in `.env.local`, run Compose with it explicitly:

```bash
docker compose --env-file .env.local up --build
```

### Configurable app port

The Next.js container port is configurable with env vars:

- `APP_PORT` — the port the app listens on inside the container
- `APP_HOST_PORT` — the host port published by Docker Compose

Example:

```bash
APP_PORT=4000
APP_HOST_PORT=4000
SITE_URL=http://localhost:4000

docker compose up --build
```

### Optional built-in TLS with Let's Encrypt

If you do not already have a reverse proxy, there is an optional `tls` profile
that starts a Caddy front-end. Caddy will automatically obtain and renew a
certificate for a public domain via ACME/Let's Encrypt-compatible issuers.

Set these env vars first:

- `APP_DOMAIN=stowage.example.com`
- `NEXT_PUBLIC_POCKETBASE_URL=https://stowage.example.com/pb`
- `SITE_URL=https://stowage.example.com`

Then start the TLS profile:

```bash
docker compose --profile tls up --build
```

Notes:

- `APP_DOMAIN` must resolve publicly to the Docker host.
- Ports `80` and `443` must be reachable from the internet for certificate issuance.
- If you already have nginx/Caddy/Traefik in front, skip the `tls` profile and keep using your existing reverse proxy.
- The optional Caddy service proxies `/pb/*` to PocketBase so the browser can use PocketBase over the same HTTPS origin.

## Releases

Stowage uses numbered releases such as `0.2.0`, `0.2.1`, and `1.0.0`.

Each release publishes:

- a git tag like `v0.2.1`
- a GitHub Release with human-readable notes
- `ghcr.io/kroqdotdev/stowage-app:<version>`
- `ghcr.io/kroqdotdev/stowage-pocketbase:<version>`
- `ghcr.io/kroqdotdev/stowage-caddy:<version>`
- `docker-compose.release.yml` as a release deployment bundle

For production/self-hosted deploys, pin exact image tags instead of floating to a
new version unintentionally.

Image contents:

- `stowage-app` contains the production Next.js standalone server plus static/public assets
- `stowage-pocketbase` contains the pinned PocketBase binary plus this repo's `pb_migrations/`
- `stowage-caddy` contains the bundled Caddy config for TLS termination and `/pb` proxying
- neither image contains your persistent PocketBase data; that still lives in `pb_data/`

See [RELEASING.md](/Users/sauer/Documents/cc/stowage.cc/RELEASING.md) for the release checklist and tag flow.

### Release Deployment Modes

Tagged releases can now be deployed directly with [docker-compose.release.yml](/Users/sauer/Documents/cc/stowage.cc/docker-compose.release.yml).

App only:

```bash
STOWAGE_VERSION=0.2.0 docker compose -f docker-compose.release.yml up -d
```

Use this when PocketBase and/or your reverse proxy already live elsewhere. In
that mode, set `POCKETBASE_URL` and `NEXT_PUBLIC_POCKETBASE_URL` to your
existing PocketBase endpoints.

App + PocketBase:

```bash
STOWAGE_VERSION=0.2.0 docker compose -f docker-compose.release.yml --profile pocketbase up -d
```

Full stack (app + PocketBase + TLS proxy):

```bash
STOWAGE_VERSION=0.2.0 docker compose -f docker-compose.release.yml --profile full up -d
```

For the full stack profile, set:

- `APP_DOMAIN` to your public domain
- `SITE_URL=https://<APP_DOMAIN>`
- `NEXT_PUBLIC_POCKETBASE_URL=https://<APP_DOMAIN>/pb`

By default, the release compose file binds the app and PocketBase ports to
`127.0.0.1`; set `APP_HOST_BIND=0.0.0.0` and/or `POCKETBASE_HOST_BIND=0.0.0.0`
if you intentionally want them reachable off-host without Caddy.

### Production deployment

The browser talks to PocketBase directly for realtime subscriptions, so for a public deployment put both services behind a reverse proxy on a single domain (Caddy, nginx, Traefik). Set `NEXT_PUBLIC_POCKETBASE_URL` to the proxy URL the browser should use (e.g. `https://stowage.example.com/pb`), and `POCKETBASE_URL` to the internal address Next uses to reach PB (e.g. `http://pocketbase:8090`). `pb_data/` is the only stateful directory — back it up.

Environment variables:

| Var                                        | Required | Notes                                                   |
| ------------------------------------------ | -------- | ------------------------------------------------------- |
| `APP_PORT`                                 | no       | Port the Next.js app listens on inside the container    |
| `APP_HOST_PORT`                            | no       | Host port mapped to the Next.js container               |
| `POCKETBASE_HOST_PORT`                     | no       | Host port mapped to PocketBase                          |
| `APP_DOMAIN`                               | no       | Public domain for the optional built-in TLS profile     |
| `HTTP_PORT` / `HTTPS_PORT`                 | no       | Host ports published by the optional Caddy TLS service  |
| `POCKETBASE_URL`                           | yes      | Server-to-PB URL (e.g. `http://pocketbase:8090`)        |
| `NEXT_PUBLIC_POCKETBASE_URL`               | yes      | Browser-to-PB URL (same origin as the app in prod)      |
| `POCKETBASE_SUPERUSER_EMAIL` / `_PASSWORD` | yes      | Used by `pnpm pb:bootstrap` and the app's admin client  |
| `STORAGE_LIMIT_GB`                         | no       | Global cap on total attachment bytes; omit for no limit |
| `SITE_URL`                                 | no       | Base URL embedded in label QR codes                     |

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

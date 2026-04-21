# Releasing Stowage

Stowage uses numbered releases and git tags.

## Versioning

Use `MAJOR.MINOR.PATCH`.

- `PATCH` for bug fixes, docs-only release notes, and low-risk deployment fixes.
- `MINOR` for new features, additive env vars, and additive API/schema behavior.
- `MAJOR` for breaking changes to env vars, deployment behavior, or upgrade flow.

Before `1.0.0`, treat minor releases as the place where breaking changes may still
land if necessary, but call them out clearly in the changelog and release notes.

## Published artifacts

Each tagged release publishes:

- a git tag such as `v0.2.1`
- a GitHub Release with changelog notes
- a multi-arch app image at `ghcr.io/kroqdotdev/stowage-app:<version>`
- a multi-arch PocketBase image at `ghcr.io/kroqdotdev/stowage-pocketbase:<version>`
- a multi-arch Caddy image at `ghcr.io/kroqdotdev/stowage-caddy:<version>`
- the release deployment bundle file `docker-compose.release.yml`

Those image tags are meant to be pinned in deployment config so upgrades happen
intentionally one release at a time.

Image contents:

- `stowage-app` contains the production Next.js standalone server, compiled server
  output, and the repo's `public/` plus `.next/static/` assets
- `stowage-pocketbase` contains the pinned PocketBase binary plus the repo's
  bundled `pb_migrations/`; persistent user data still lives in `/pb_data`
- `stowage-caddy` contains the repo's Caddyfile for TLS termination and `/pb`
  reverse proxy routing, while certificate state lives in `/data` and `/config`

## Release checklist

1. Make sure `main` is green and ready to ship.
2. Update [CHANGELOG.md](/Users/sauer/Documents/cc/stowage.cc/CHANGELOG.md) by moving release-worthy items out of `Unreleased`.
3. Bump the version in [package.json](/Users/sauer/Documents/cc/stowage.cc/package.json).
4. Commit the version/changelog update.
5. Create and push the release tag:

```bash
git tag v0.2.0
git push origin main --tags
```

6. Wait for the `Release` GitHub Actions workflow to:
   - verify the tag matches `package.json`
   - run lint, typecheck, and tests
   - build and publish app, PocketBase, and Caddy images to GHCR
   - create the GitHub Release from the matching changelog section

## Prereleases

Prereleases can use tags like `v0.3.0-rc.1`.

- They publish images tagged with the prerelease version.
- They create a GitHub prerelease instead of a stable release.
- They do not move the stable `latest` Docker tag.

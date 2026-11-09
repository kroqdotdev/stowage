# Changelog

All notable changes to this project will be documented in this file.

The release process follows semantic versioning once the project reaches `1.0.0`.
Until then, version numbers still communicate upgrade risk:

- patch = fixes and low-risk operational changes
- minor = new features and notable improvements
- major = intentional breaking changes

## [Unreleased]

### Added

- Settings > Updates for admins: the installed version and build, newer
  releases with their notes, and a one-click update when the optional
  `updater` sidecar runs (`--profile updater`), with the compose commands shown
  otherwise.
- Published `stowage-updater` release image.
- `/api/health` now reports the running version.

### Changed

- Rebuilt the UI in the Workshop design: concrete background, charcoal
  sidebar, one amber primary, cards for objects and sheets for lists, a
  phone layout with bottom navigation, and an asset scan flow.
- Release images are built natively per platform (amd64 on the self-hosted
  runner, arm64 on GitHub's arm runner) and merged into multi-arch manifests,
  with layer caches kept in GHCR.

## [0.2.0] - 2026-04-21

### Added

- Deployable release bundle via `docker-compose.release.yml` using published GHCR images.
- Published `stowage-caddy` release image for the optional built-in TLS proxy.
- Release deployment modes for app-only, app plus PocketBase, or full stack.

### Changed

- Updated the in-app logo, favicon, and app icons to the new branding asset set.

## [0.1.0] - 2026-04-21

### Added

- Initial self-hosted Stowage release.
- Next.js app for asset management, labels, schedules, attachments, and admin flows.
- PocketBase-backed auth, storage, migrations, and Docker deployment support.
- Configurable Docker app and host ports via env vars.
- Optional built-in TLS termination with Caddy for public-domain deployments.
- Tag-driven release automation for GitHub Releases and GHCR Docker images.

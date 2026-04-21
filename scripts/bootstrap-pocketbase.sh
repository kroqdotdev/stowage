#!/usr/bin/env bash
# Creates (or updates) a PocketBase superuser using env credentials.
# Safe to run repeatedly — upsert is idempotent.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_BIN="$REPO_ROOT/bin/pocketbase"

if [ ! -x "$PB_BIN" ]; then
  echo "pocketbase binary missing — run 'pnpm pb:setup' first" >&2
  exit 1
fi

# Source .env.local if present so local dev picks up the creds.
if [ -f "$REPO_ROOT/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env.local"
  set +a
fi

: "${POCKETBASE_SUPERUSER_EMAIL:?POCKETBASE_SUPERUSER_EMAIL is required}"
: "${POCKETBASE_SUPERUSER_PASSWORD:?POCKETBASE_SUPERUSER_PASSWORD is required}"

"$PB_BIN" superuser upsert \
  "$POCKETBASE_SUPERUSER_EMAIL" \
  "$POCKETBASE_SUPERUSER_PASSWORD" \
  --dir="$REPO_ROOT/pb_data"

echo "Superuser $POCKETBASE_SUPERUSER_EMAIL ready"

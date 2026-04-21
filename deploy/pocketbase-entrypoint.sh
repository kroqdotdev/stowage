#!/bin/sh
set -eu

PB_BIN="/usr/local/bin/pocketbase"
PB_DATA_DIR="${POCKETBASE_DATA_DIR:-/pb_data}"

if [ -n "${POCKETBASE_SUPERUSER_EMAIL:-}" ] && [ -n "${POCKETBASE_SUPERUSER_PASSWORD:-}" ]; then
  "$PB_BIN" superuser upsert \
    "$POCKETBASE_SUPERUSER_EMAIL" \
    "$POCKETBASE_SUPERUSER_PASSWORD" \
    --dir="$PB_DATA_DIR"
fi

exec "$PB_BIN" serve \
  --http=0.0.0.0:8090 \
  --dir="$PB_DATA_DIR" \
  --migrationsDir=/pb_migrations

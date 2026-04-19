#!/usr/bin/env bash
# Downloads the PocketBase binary into ./bin/pocketbase for the current host arch.
# Pin with PB_VERSION env var; defaults to the version below.
set -euo pipefail

PB_VERSION="${PB_VERSION:-0.37.1}"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64 | amd64) ARCH="amd64" ;;
  arm64 | aarch64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

case "$OS" in
  darwin | linux) ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$REPO_ROOT/bin"
TARGET="$BIN_DIR/pocketbase"
ASSET="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${ASSET}"

mkdir -p "$BIN_DIR"

if [ -x "$TARGET" ] && "$TARGET" --version 2>/dev/null | grep -q "$PB_VERSION"; then
  echo "pocketbase v$PB_VERSION already present at $TARGET"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $ASSET..."
curl -fsSL -o "$TMP/pb.zip" "$URL"
unzip -q -o "$TMP/pb.zip" -d "$TMP"
mv "$TMP/pocketbase" "$TARGET"
chmod +x "$TARGET"

echo "Installed $("$TARGET" --version) at $TARGET"

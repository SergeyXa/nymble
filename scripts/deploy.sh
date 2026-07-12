#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="nymble"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${NYMBLE_DEPLOY_DIR:-/srv/nymble}"

as_root() {
  if [[ "${EUID}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

echo "Building $APP_NAME from $SOURCE_DIR"
cd "$SOURCE_DIR"
npm run build

echo "Creating runtime directory: $TARGET_DIR"
as_root mkdir -p "$TARGET_DIR/data" "$TARGET_DIR/dist" "$TARGET_DIR/src/public"

if [[ ! -f "$TARGET_DIR/data/dictionary.json" && -f "$SOURCE_DIR/data/dictionary.json" ]]; then
  echo "Seeding initial dictionary data"
  as_root cp "$SOURCE_DIR/data/dictionary.json" "$TARGET_DIR/data/dictionary.json"
fi

echo "Copying runtime files"
as_root rsync -a --delete "$SOURCE_DIR/dist/" "$TARGET_DIR/dist/"
as_root rsync -a --delete "$SOURCE_DIR/src/public/" "$TARGET_DIR/src/public/"
as_root rsync -a "$SOURCE_DIR/package.json" "$SOURCE_DIR/package-lock.json" "$TARGET_DIR/"
as_root rsync -a "$SOURCE_DIR/scripts/install-systemd-service.sh" "$TARGET_DIR/"

echo "Installing production dependencies"
as_root npm install --omit=dev --prefix "$TARGET_DIR"

echo
echo "Deploy complete: $TARGET_DIR"
echo
echo "If the systemd service is not installed yet, run:"
echo "  sudo $TARGET_DIR/install-systemd-service.sh"
echo
echo "This deploy script does not restart the service."
echo "Start it manually when you are ready:"
echo "  sudo systemctl start $APP_NAME"

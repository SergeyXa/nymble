#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="nymble"
APP_DIR="${NYMBLE_APP_DIR:-/srv/nymble}"
SERVICE_NAME="${NYMBLE_SERVICE_NAME:-nymble}"
NODE_BIN="${NODE_BIN:-}"
RUN_USER="${NYMBLE_RUN_USER:-www-data}"
RUN_GROUP="${NYMBLE_RUN_GROUP:-www-data}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3100}"
DICTIONARY_PATH="${DICTIONARY_PATH:-$APP_DIR/data/dictionary.json}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this installer with sudo:"
  echo "  sudo $0"
  exit 1
fi

if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi

if [[ ! -x "$NODE_BIN" ]]; then
  echo "Node executable not found. Set NODE_BIN=/path/to/node and try again."
  exit 1
fi

if [[ ! -f "$APP_DIR/dist/server/index.js" ]]; then
  echo "Application entrypoint not found: $APP_DIR/dist/server/index.js"
  echo "Run the deploy script first."
  exit 1
fi

mkdir -p "$APP_DIR/data"
chown -R "$RUN_USER:$RUN_GROUP" "$APP_DIR/data"

if [[ -f "$SERVICE_FILE" ]]; then
  echo "Systemd service already exists: $SERVICE_FILE"
  echo "Leaving it unchanged."
  echo
  echo "Start it manually when you are ready:"
  echo "  sudo systemctl start $SERVICE_NAME"
  exit 0
fi

cat > "$SERVICE_FILE" <<EOF_SERVICE
[Unit]
Description=Nymble
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN dist/server/index.js
Restart=always
RestartSec=3

Environment=NODE_ENV=production
Environment=HOST=$HOST
Environment=PORT=$PORT
Environment=DICTIONARY_PATH=$DICTIONARY_PATH

User=$RUN_USER
Group=$RUN_GROUP

[Install]
WantedBy=multi-user.target
EOF_SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo
echo "Installed systemd service: $SERVICE_FILE"
echo "The service was enabled, but not started."
echo
echo "Start it manually when you are ready:"
echo "  sudo systemctl start $SERVICE_NAME"
echo
echo "Useful checks:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"

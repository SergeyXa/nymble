#!/usr/bin/env bash
# Installs the application's systemd unit.
set -Eeuo pipefail

APP_NAME="nymble"
APP_DIR="${NYMBLE_APP_DIR:-/srv/nymble}"
SERVICE_NAME="${NYMBLE_SERVICE_NAME:-nymble}"
NODE_BIN="${NODE_BIN:-}"
RUN_USER="${NYMBLE_RUN_USER:-www-data}"
RUN_GROUP="${NYMBLE_RUN_GROUP:-www-data}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3100}"
DICTIONARY_PATH="${DICTIONARY_PATH:-$APP_DIR/data/dictionaries.json}"
LEAK_DETECTION_ENABLED="${LEAK_DETECTION_ENABLED:-true}"
LEAK_DETECTION_PROVIDER="${LEAK_DETECTION_PROVIDER:-presidio}"
PRESIDIO_ANALYZER_URL="${PRESIDIO_ANALYZER_URL:-http://127.0.0.1:5002}"
PRESIDIO_DEFAULT_LANGUAGE="${PRESIDIO_DEFAULT_LANGUAGE:-en}"
PRESIDIO_SUPPORTED_LANGUAGES="${PRESIDIO_SUPPORTED_LANGUAGES:-en}"
PRESIDIO_SCORE_THRESHOLD="${PRESIDIO_SCORE_THRESHOLD:-0.5}"
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
Environment=LEAK_DETECTION_ENABLED=$LEAK_DETECTION_ENABLED
Environment=LEAK_DETECTION_PROVIDER=$LEAK_DETECTION_PROVIDER
Environment=PRESIDIO_ANALYZER_URL=$PRESIDIO_ANALYZER_URL
Environment=PRESIDIO_DEFAULT_LANGUAGE=$PRESIDIO_DEFAULT_LANGUAGE
Environment=PRESIDIO_SUPPORTED_LANGUAGES=$PRESIDIO_SUPPORTED_LANGUAGES
Environment=PRESIDIO_SCORE_THRESHOLD=$PRESIDIO_SCORE_THRESHOLD

User=$RUN_USER
Group=$RUN_GROUP

[Install]
WantedBy=multi-user.target
EOF_SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

if systemctl is-active --quiet "$SERVICE_NAME"; then
  systemctl restart "$SERVICE_NAME"
  echo
  echo "Updated and restarted systemd service: $SERVICE_FILE"
else
  echo
  echo "Installed or updated systemd service: $SERVICE_FILE"
  echo "The service was enabled, but remains stopped."
  echo
  echo "Start it manually when you are ready:"
  echo "  sudo systemctl start $SERVICE_NAME"
fi
echo
echo "Useful checks:"
echo "  sudo systemctl status $SERVICE_NAME"
echo "  sudo journalctl -u $SERVICE_NAME -f"

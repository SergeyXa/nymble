#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${NYMBLE_DEPLOY_DIR:-/srv/nymble}"
APP_NAME="${NYMBLE_DEPLOY_NAME:-}"
if [[ -z "$APP_NAME" && -f "$TARGET_DIR/.env" ]]; then
  APP_NAME="$(sed -n 's/^NYMBLE_DEPLOY_NAME=//p' "$TARGET_DIR/.env" | tail -n 1)"
fi
APP_NAME="${APP_NAME:-nymble}"
COMPOSE_FILE="$SOURCE_DIR/docker-compose.yml"
RUNTIME_ENV_EXAMPLE="$SOURCE_DIR/ops/runtime.env.example"
IMAGE_TAG="${NYMBLE_IMAGE_TAG:-$APP_NAME:$(git -C "$SOURCE_DIR" rev-parse --short=12 HEAD)-$(date -u +%Y%m%d%H%M%S)}"

if [[ ! "$APP_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
  echo "NYMBLE_DEPLOY_NAME must use lowercase letters, digits, hyphens, or underscores."
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run the Docker deployment with sudo:"
  echo "  sudo npm run deploy"
  exit 1
fi

compose() {
  docker compose \
    --project-name "$APP_NAME" \
    --env-file "$TARGET_DIR/.env" \
    -f "$TARGET_DIR/docker-compose.yml" \
    "$@"
}

set_runtime_env_value() {
  local key="$1"
  local value="$2"

  sed -i "/^${key}=/d" "$TARGET_DIR/.env"
  printf '%s=%s\n' "$key" "$value" >> "$TARGET_DIR/.env"
  chmod 600 "$TARGET_DIR/.env"
}

get_runtime_env_value() {
  local key="$1"
  local default_value="$2"
  local value

  value="$(sed -n "s/^${key}=//p" "$TARGET_DIR/.env" | tail -n 1)"
  printf '%s' "${value:-$default_value}"
}

wait_for_health() {
  local attempt
  local url="http://127.0.0.1:${HOST_PORT}/api/health"

  for attempt in {1..30}; do
    if curl --fail --silent --show-error --max-time 2 "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done

  return 1
}

remove_old_nymble_images() {
  local image
  local images=()

  mapfile -t images < <(docker image ls "$APP_NAME" --format '{{.Repository}}:{{.Tag}}')
  for image in "${images[@]}"; do
    if [[ "$image" != "$IMAGE_TAG" ]]; then
      docker image rm --force "$image"
    fi
  done
}

echo "Building $APP_NAME from $SOURCE_DIR"
# Docker creates build output inside its build stages. Host dist/ is excluded
# by .dockerignore, so this privileged command never creates root-owned files
# in the working tree.
docker build --tag "$IMAGE_TAG" "$SOURCE_DIR"

echo "Creating runtime directory: $TARGET_DIR"
mkdir -p "$TARGET_DIR/data"

if [[ ! -f "$TARGET_DIR/data/dictionaries.json" && -f "$SOURCE_DIR/data/dictionaries.json" ]]; then
  echo "Seeding initial dictionary data"
  cp "$SOURCE_DIR/data/dictionaries.json" "$TARGET_DIR/data/dictionaries.json"
fi
chown -R 1000:1000 "$TARGET_DIR/data"

echo "Installing Compose configuration"
install -m 644 "$COMPOSE_FILE" "$TARGET_DIR/docker-compose.yml"
if [[ ! -f "$TARGET_DIR/.env" ]]; then
  install -m 600 "$RUNTIME_ENV_EXAMPLE" "$TARGET_DIR/.env"
fi
set_runtime_env_value "NYMBLE_DEPLOY_NAME" "$APP_NAME"
set_runtime_env_value "NYMBLE_IMAGE_TAG" "$IMAGE_TAG"
if [[ -n "${NYMBLE_HOST_PORT:-}" ]]; then
  set_runtime_env_value "NYMBLE_HOST_PORT" "$NYMBLE_HOST_PORT"
fi
HOST_PORT="$(get_runtime_env_value "NYMBLE_HOST_PORT" "3100")"

echo "Starting Compose services"
compose up -d --no-build --remove-orphans

if ! wait_for_health; then
  echo "Nymble did not become healthy. The previous Nymble images were kept."
  exit 1
fi

remove_old_nymble_images

echo
echo "Deploy complete: $TARGET_DIR"
echo
echo "Nymble is available at http://127.0.0.1:$HOST_PORT"

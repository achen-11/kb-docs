#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_DIR="${PROJECT_DIR}"
BIND_HOST="127.0.0.1"
CONFIG_DIR="/etc/kb-docs-preview"
DATA_DIR="/srv/kb-docs-preview"
GIT_BRANCH="main"
GIT_REMOTE="origin"
HOSTNAME_VALUE="docs-preview.kbdev.com"
KEEP_RELEASES="5"
NGINX_CONFIG="/etc/nginx/conf.d/kb-docs-preview.conf"
OUTPUT_DIR="${PROJECT_DIR}/.local-preview/server-config"
PORT="4173"
SERVICE_GROUP="kb-docs-preview"
SERVICE_USER="kb-docs-preview"
SYNC_INTERVAL_SECONDS="30"
SYNC_SERVICE_UNIT="/etc/systemd/system/kb-docs-preview-sync.service"
SYNC_TIMER_UNIT="/etc/systemd/system/kb-docs-preview-sync.timer"
SYSTEMD_UNIT="/etc/systemd/system/kb-docs-preview.service"
UPDATE_LOCK_TIMEOUT_MS="180000"
APPLY="false"
ENABLE_GIT_SYNC="false"
INSTALL_NGINX="true"

usage() {
  echo "Usage: bash deploy/preview/install.sh [options]"
  echo ""
  echo "Renders configuration by default. Add --apply on the target Linux host."
  echo ""
  echo "  --app-dir PATH"
  echo "  --bind-host IP"
  echo "  --config-dir PATH"
  echo "  --data-dir PATH"
  echo "  --git-branch NAME"
  echo "  --git-remote NAME"
  echo "  --hostname HOST"
  echo "  --keep-releases NUMBER"
  echo "  --lock-timeout MILLISECONDS"
  echo "  --nginx-config PATH"
  echo "  --output-dir PATH"
  echo "  --port NUMBER"
  echo "  --service-group NAME"
  echo "  --service-user NAME"
  echo "  --sync-interval SECONDS"
  echo "  --systemd-unit PATH"
  echo "  --with-git-sync"
  echo "  --without-nginx"
  echo "  --apply"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --bind-host) BIND_HOST="$2"; shift 2 ;;
    --config-dir) CONFIG_DIR="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --git-branch) GIT_BRANCH="$2"; shift 2 ;;
    --git-remote) GIT_REMOTE="$2"; shift 2 ;;
    --hostname) HOSTNAME_VALUE="$2"; shift 2 ;;
    --keep-releases) KEEP_RELEASES="$2"; shift 2 ;;
    --lock-timeout) UPDATE_LOCK_TIMEOUT_MS="$2"; shift 2 ;;
    --nginx-config) NGINX_CONFIG="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --service-group) SERVICE_GROUP="$2"; shift 2 ;;
    --service-user) SERVICE_USER="$2"; shift 2 ;;
    --sync-interval) SYNC_INTERVAL_SECONDS="$2"; shift 2 ;;
    --systemd-unit) SYSTEMD_UNIT="$2"; shift 2 ;;
    --with-git-sync) ENABLE_GIT_SYNC="true"; shift ;;
    --without-nginx) INSTALL_NGINX="false"; shift ;;
    --apply) APPLY="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

node "${PROJECT_DIR}/scripts/render-preview-server-config.mjs" \
  --app-dir "${APP_DIR}" \
  --bind-host "${BIND_HOST}" \
  --config-dir "${CONFIG_DIR}" \
  --data-dir "${DATA_DIR}" \
  --git-branch "${GIT_BRANCH}" \
  --git-remote "${GIT_REMOTE}" \
  --group "${SERVICE_GROUP}" \
  --hostname "${HOSTNAME_VALUE}" \
  --keep-releases "${KEEP_RELEASES}" \
  --output-dir "${OUTPUT_DIR}" \
  --port "${PORT}" \
  --sync-interval "${SYNC_INTERVAL_SECONDS}" \
  --lock-timeout "${UPDATE_LOCK_TIMEOUT_MS}" \
  --user "${SERVICE_USER}"

if [[ "${APPLY}" != "true" ]]; then
  echo ""
  echo "Dry run complete. Review generated files in: ${OUTPUT_DIR}"
  if [[ "${INSTALL_NGINX}" == "true" ]]; then
    echo "No system files, users, services, or Nginx configuration were changed."
  else
    echo "No system files, users, or services were changed. Nginx installation is disabled."
  fi
  if [[ "${ENABLE_GIT_SYNC}" == "true" ]]; then
    echo "Git synchronization configuration was rendered but not installed."
  fi
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "--apply must be run as root on the target Linux host" >&2
  exit 1
fi
if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  echo "Service user does not exist: ${SERVICE_USER}" >&2
  echo "Create the dedicated non-root account before applying the installation." >&2
  exit 1
fi
if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Application directory is not a kb-docs checkout: ${APP_DIR}" >&2
  exit 1
fi
if ! command -v runuser >/dev/null 2>&1; then
  echo "runuser is required for the Linux installation path" >&2
  exit 1
fi
for required_command in corepack getent node systemctl; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Required command is not installed: ${required_command}" >&2
    exit 1
  fi
done
if [[ "${INSTALL_NGINX}" == "true" ]] && ! command -v nginx >/dev/null 2>&1; then
  echo "Required command is not installed: nginx" >&2
  exit 1
fi
if [[ "${ENABLE_GIT_SYNC}" == "true" ]]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "Required command is not installed: git" >&2
    exit 1
  fi
  if ! runuser -u "${SERVICE_USER}" -- git -C "${APP_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Git synchronization requires a real Git worktree: ${APP_DIR}" >&2
    exit 1
  fi
  if ! runuser -u "${SERVICE_USER}" -- git -C "${APP_DIR}" remote get-url "${GIT_REMOTE}" >/dev/null 2>&1; then
    echo "Git remote does not exist for ${SERVICE_USER}: ${GIT_REMOTE}" >&2
    exit 1
  fi
fi

SERVICE_HOME="$(getent passwd "${SERVICE_USER}" | cut -d: -f6)"
if [[ -z "${SERVICE_HOME}" ]]; then
  echo "Unable to determine home directory for ${SERVICE_USER}" >&2
  exit 1
fi

install -d -m 0750 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${DATA_DIR}"
install -d -m 0750 -o root -g "${SERVICE_GROUP}" "${CONFIG_DIR}"
install -d -m 0755 "$(dirname "${SYSTEMD_UNIT}")"
install -m 0640 -o root -g "${SERVICE_GROUP}" \
  "${OUTPUT_DIR}/preview.env" "${CONFIG_DIR}/preview.env"
install -m 0750 -o root -g "${SERVICE_GROUP}" \
  "${OUTPUT_DIR}/git-askpass.sh" "${CONFIG_DIR}/git-askpass.sh"
install -m 0644 "${OUTPUT_DIR}/kb-docs-preview.service" "${SYSTEMD_UNIT}"
if [[ "${ENABLE_GIT_SYNC}" == "true" ]]; then
  install -m 0644 "${OUTPUT_DIR}/kb-docs-preview-sync.service" "${SYNC_SERVICE_UNIT}"
  install -m 0644 "${OUTPUT_DIR}/kb-docs-preview-sync.timer" "${SYNC_TIMER_UNIT}"
fi
if [[ "${INSTALL_NGINX}" == "true" ]]; then
  install -d -m 0755 "$(dirname "${NGINX_CONFIG}")"
  install -m 0644 "${OUTPUT_DIR}/kb-docs-preview.nginx.conf" "${NGINX_CONFIG}"
fi

(
  cd "${APP_DIR}"
  runuser -u "${SERVICE_USER}" -- env HOME="${SERVICE_HOME}" \
    corepack pnpm install --frozen-lockfile
  runuser -u "${SERVICE_USER}" -- env \
    DOCS_PREVIEW_KEEP_RELEASES="${KEEP_RELEASES}" \
    DOCS_PREVIEW_ROOT="${DATA_DIR}" \
    HOME="${SERVICE_HOME}" \
    corepack pnpm docs:preview:publish
)

systemctl daemon-reload
systemctl enable --now kb-docs-preview.service
if [[ "${INSTALL_NGINX}" == "true" ]]; then
  nginx -t
  systemctl reload nginx
fi

HEALTHY="false"
for ((attempt = 1; attempt <= 15; attempt += 1)); do
  if (
    cd "${APP_DIR}"
    runuser -u "${SERVICE_USER}" -- env \
      DOCS_PREVIEW_PORT="${PORT}" \
      HOME="${SERVICE_HOME}" \
      corepack pnpm docs:preview:health
  ); then
    HEALTHY="true"
    break
  fi

  if ((attempt < 15)); then
    echo "Preview health check attempt ${attempt} failed; retrying in 1 second..." >&2
    sleep 1
  fi
done

if [[ "${HEALTHY}" != "true" ]]; then
  echo "Preview service did not become healthy after 15 attempts." >&2
  exit 1
fi

if [[ "${ENABLE_GIT_SYNC}" == "true" ]]; then
  systemctl enable --now kb-docs-preview-sync.timer
fi

if [[ "${INSTALL_NGINX}" == "true" ]]; then
  echo "Preview server installation completed: http://${HOSTNAME_VALUE}/"
else
  echo "Preview server installation completed: http://${BIND_HOST}:${PORT}/"
fi
if [[ "${ENABLE_GIT_SYNC}" == "true" ]]; then
  echo "Git synchronization enabled: ${GIT_REMOTE}/${GIT_BRANCH} every ${SYNC_INTERVAL_SECONDS} seconds"
fi

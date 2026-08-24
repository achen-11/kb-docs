#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_DIR="${PROJECT_DIR}"
AUTH_TOKEN_FILE=""
BIND_HOST="127.0.0.1"
CONFIG_DIR="/etc/kb-docs-editor"
OUTPUT_DIR="${PROJECT_DIR}/.local-preview/editor-config"
PORT="4174"
FAST_PREVIEW_HEALTH_URL="http://127.0.0.1:4173/"
FAST_PREVIEW_URL="http://127.0.0.1:4173"
STABLE_PREVIEW_STATUS_URL="http://127.0.0.1:4175/__preview/status"
STABLE_PREVIEW_URL="http://127.0.0.1:4175"
STABLE_BUILD_DEBOUNCE_MS="8000"
PREVIEW_ENV_FILE="/etc/kb-docs-preview/preview.env"
PREVIEW_ROOT="/srv/kb-docs-preview"
LOCK_TIMEOUT="180000"
SERVICE_GROUP="kb-docs-preview"
SERVICE_USER="kb-docs-preview"
SYSTEMD_UNIT="/etc/systemd/system/kb-docs-editor.service"
APPLY="false"
SECURE_COOKIE="false"
PRODUCTION_PUBLISH_ENABLED="false"
KOOBOO_TARGET_URL=""
KOOBOO_ARTIFACT_DIR="/srv/kb-docs-kooboo-artifact"
KOOBOO_BASELINE_FILE=""
KOOBOO_INITIAL_BASELINE=""
KOOBOO_VERIFY_PATHS="/,/cms/index.html,/api/net/ip.html"

usage() {
  echo "Usage: bash deploy/editor/install.sh [options]"
  echo ""
  echo "Renders configuration by default. Add --apply on the target Linux host."
  echo ""
  echo "  --app-dir PATH"
  echo "  --auth-token-file PATH"
  echo "  --bind-host IP"
  echo "  --config-dir PATH"
  echo "  --output-dir PATH"
  echo "  --port NUMBER"
  echo "  --fast-preview-health-url URL"
  echo "  --fast-preview-url URL"
  echo "  --stable-preview-status-url URL"
  echo "  --stable-preview-url URL"
  echo "  --stable-build-debounce-ms MS"
  echo "  --preview-env-file PATH"
  echo "  --preview-root PATH"
  echo "  --lock-timeout MS"
  echo "  --service-group NAME"
  echo "  --service-user NAME"
  echo "  --systemd-unit PATH"
  echo "  --secure-cookie"
  echo "  --enable-production-publish"
  echo "  --kooboo-target-url URL"
  echo "  --kooboo-artifact-dir PATH"
  echo "  --kooboo-baseline-file PATH"
  echo "  --kooboo-initial-baseline COMMIT"
  echo "  --kooboo-verify-paths PATHS"
  echo "  --apply"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --auth-token-file) AUTH_TOKEN_FILE="$2"; shift 2 ;;
    --bind-host) BIND_HOST="$2"; shift 2 ;;
    --config-dir) CONFIG_DIR="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --fast-preview-health-url) FAST_PREVIEW_HEALTH_URL="$2"; shift 2 ;;
    --fast-preview-url|--preview-url) FAST_PREVIEW_URL="$2"; shift 2 ;;
    --stable-preview-status-url|--preview-status-url) STABLE_PREVIEW_STATUS_URL="$2"; shift 2 ;;
    --stable-preview-url) STABLE_PREVIEW_URL="$2"; shift 2 ;;
    --stable-build-debounce-ms) STABLE_BUILD_DEBOUNCE_MS="$2"; shift 2 ;;
    --preview-env-file) PREVIEW_ENV_FILE="$2"; shift 2 ;;
    --preview-root) PREVIEW_ROOT="$2"; shift 2 ;;
    --lock-timeout) LOCK_TIMEOUT="$2"; shift 2 ;;
    --service-group) SERVICE_GROUP="$2"; shift 2 ;;
    --service-user) SERVICE_USER="$2"; shift 2 ;;
    --systemd-unit) SYSTEMD_UNIT="$2"; shift 2 ;;
    --secure-cookie) SECURE_COOKIE="true"; shift ;;
    --enable-production-publish) PRODUCTION_PUBLISH_ENABLED="true"; shift ;;
    --kooboo-target-url) KOOBOO_TARGET_URL="$2"; shift 2 ;;
    --kooboo-artifact-dir) KOOBOO_ARTIFACT_DIR="$2"; shift 2 ;;
    --kooboo-baseline-file) KOOBOO_BASELINE_FILE="$2"; shift 2 ;;
    --kooboo-initial-baseline) KOOBOO_INITIAL_BASELINE="$2"; shift 2 ;;
    --kooboo-verify-paths) KOOBOO_VERIFY_PATHS="$2"; shift 2 ;;
    --apply) APPLY="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "${AUTH_TOKEN_FILE}" ]]; then
  AUTH_TOKEN_FILE="${CONFIG_DIR}/auth-token"
fi

RENDER_ARGS=(
  --app-dir "${APP_DIR}"
  --auth-token-file "${AUTH_TOKEN_FILE}"
  --bind-host "${BIND_HOST}"
  --config-dir "${CONFIG_DIR}"
  --group "${SERVICE_GROUP}"
  --output-dir "${OUTPUT_DIR}"
  --port "${PORT}"
  --fast-preview-health-url "${FAST_PREVIEW_HEALTH_URL}"
  --fast-preview-url "${FAST_PREVIEW_URL}"
  --stable-preview-status-url "${STABLE_PREVIEW_STATUS_URL}"
  --stable-preview-url "${STABLE_PREVIEW_URL}"
  --stable-build-debounce-ms "${STABLE_BUILD_DEBOUNCE_MS}"
  --preview-env-file "${PREVIEW_ENV_FILE}"
  --preview-root "${PREVIEW_ROOT}"
  --lock-timeout "${LOCK_TIMEOUT}"
  --kooboo-artifact-dir "${KOOBOO_ARTIFACT_DIR}"
  --kooboo-initial-baseline "${KOOBOO_INITIAL_BASELINE}"
  --kooboo-target-url "${KOOBOO_TARGET_URL}"
  --kooboo-verify-paths "${KOOBOO_VERIFY_PATHS}"
  --user "${SERVICE_USER}"
)
if [[ -n "${KOOBOO_BASELINE_FILE}" ]]; then
  RENDER_ARGS+=(--kooboo-baseline-file "${KOOBOO_BASELINE_FILE}")
fi
if [[ "${SECURE_COOKIE}" == "true" ]]; then
  RENDER_ARGS+=(--secure-cookie)
fi
if [[ "${PRODUCTION_PUBLISH_ENABLED}" == "true" ]]; then
  RENDER_ARGS+=(--enable-production-publish)
fi
node "${PROJECT_DIR}/scripts/render-docs-editor-config.mjs" "${RENDER_ARGS[@]}"

if [[ "${APPLY}" != "true" ]]; then
  echo ""
  echo "Dry run complete. Review generated files in: ${OUTPUT_DIR}"
  echo "No system files, services, credentials, or application files were changed."
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "--apply must be run as root on the target Linux host" >&2
  exit 1
fi
if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  echo "Service user does not exist: ${SERVICE_USER}" >&2
  exit 1
fi
if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Application directory is not a kb-docs checkout: ${APP_DIR}" >&2
  exit 1
fi
for required_command in corepack getent node runuser systemctl; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Required command is not installed: ${required_command}" >&2
    exit 1
  fi
done
if [[ ! -f "${AUTH_TOKEN_FILE}" ]]; then
  echo "Editor authentication token does not exist: ${AUTH_TOKEN_FILE}" >&2
  echo "Create a root-owned 0640 token file before applying the installation." >&2
  exit 1
fi
if [[ "${PRODUCTION_PUBLISH_ENABLED}" == "true" ]]; then
  for required_command in git kb; do
    if ! command -v "${required_command}" >/dev/null 2>&1; then
      echo "Production publishing requires command: ${required_command}" >&2
      exit 1
    fi
  done
  if [[ -z "${KOOBOO_TARGET_URL}" ]]; then
    echo "--kooboo-target-url is required with --enable-production-publish" >&2
    exit 1
  fi
  if [[ ! -d "${KOOBOO_ARTIFACT_DIR}" ]]; then
    echo "Kooboo artifact worktree does not exist: ${KOOBOO_ARTIFACT_DIR}" >&2
    exit 1
  fi
  if ! runuser -u "${SERVICE_USER}" -- test -w "${KOOBOO_ARTIFACT_DIR}"; then
    echo "Kooboo artifact worktree is not writable by ${SERVICE_USER}: ${KOOBOO_ARTIFACT_DIR}" >&2
    exit 1
  fi
  if ! runuser -u "${SERVICE_USER}" -- test -r "${KOOBOO_ARTIFACT_DIR}/.env"; then
    echo "Kooboo artifact credentials are not readable by ${SERVICE_USER}: ${KOOBOO_ARTIFACT_DIR}/.env" >&2
    exit 1
  fi
  if [[ ! -f "${KOOBOO_BASELINE_FILE:-${PREVIEW_ROOT}/kooboo-deploy-baseline.json}" && ! "${KOOBOO_INITIAL_BASELINE}" =~ ^[a-f0-9]{40}$ ]]; then
    echo "Provide --kooboo-initial-baseline when no deployment baseline file exists." >&2
    exit 1
  fi
fi
if ! runuser -u "${SERVICE_USER}" -- test -r "${AUTH_TOKEN_FILE}"; then
  echo "Editor authentication token is not readable by ${SERVICE_USER}: ${AUTH_TOKEN_FILE}" >&2
  exit 1
fi

SERVICE_HOME="$(getent passwd "${SERVICE_USER}" | cut -d: -f6)"
if [[ -z "${SERVICE_HOME}" ]]; then
  echo "Unable to determine home directory for ${SERVICE_USER}" >&2
  exit 1
fi

install -d -m 0750 -o root -g "${SERVICE_GROUP}" "${CONFIG_DIR}"
install -d -m 0755 "$(dirname "${SYSTEMD_UNIT}")"
install -m 0640 -o root -g "${SERVICE_GROUP}" "${OUTPUT_DIR}/editor.env" "${CONFIG_DIR}/editor.env"
install -m 0644 "${OUTPUT_DIR}/kb-docs-editor.service" "${SYSTEMD_UNIT}"

(
  cd "${APP_DIR}"
  runuser -u "${SERVICE_USER}" -- env HOME="${SERVICE_HOME}" CI=true corepack pnpm install --frozen-lockfile
  runuser -u "${SERVICE_USER}" -- env HOME="${SERVICE_HOME}" CI=true corepack pnpm docs:editor:build
)

systemctl daemon-reload
systemctl enable kb-docs-editor.service
systemctl restart kb-docs-editor.service

HEALTHY="false"
for ((attempt = 1; attempt <= 15; attempt += 1)); do
  if runuser -u "${SERVICE_USER}" -- env DOCS_EDITOR_PORT="${PORT}" \
    node "${APP_DIR}/scripts/check-docs-editor.mjs"; then
    HEALTHY="true"
    break
  fi
  if ((attempt < 15)); then
    echo "Editor health check attempt ${attempt} failed; retrying in 1 second..." >&2
    sleep 1
  fi
done

if [[ "${HEALTHY}" != "true" ]]; then
  echo "Documentation editor did not become healthy after 15 attempts." >&2
  exit 1
fi

echo "Documentation editor installation completed: http://${BIND_HOST}:${PORT}/"

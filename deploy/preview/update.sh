#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="/etc/kb-docs-preview/preview.env"
HEALTH_URL=""
INSTALL_DEPS="false"
REASON="manual update"
SKIP_LOCK="false"
ORIGINAL_ARGS=("$@")

usage() {
  echo "Usage: bash deploy/preview/update.sh [options]"
  echo "  --app-dir PATH"
  echo "  --env-file PATH"
  echo "  --health-url URL"
  echo "  --install-deps"
  echo "  --reason TEXT"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir) PROJECT_DIR="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --health-url) HEALTH_URL="$2"; shift 2 ;;
    --install-deps) INSTALL_DEPS="true"; shift ;;
    --reason) REASON="$2"; shift 2 ;;
    --skip-lock) SKIP_LOCK="true"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ ! -f "${PROJECT_DIR}/package.json" ]]; then
  echo "Application directory is not a kb-docs checkout: ${PROJECT_DIR}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Preview environment file does not exist: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

if [[ "${SKIP_LOCK}" != "true" ]]; then
  PREVIEW_ROOT="${DOCS_PREVIEW_ROOT:-${PROJECT_DIR}/.local-preview}"
  LOCK_FILE="${DOCS_PREVIEW_UPDATE_LOCK_FILE:-${PREVIEW_ROOT}/.update.lock}"
  LOCK_TIMEOUT="${DOCS_PREVIEW_UPDATE_LOCK_TIMEOUT_MS:-180000}"
  exec node "${PROJECT_DIR}/scripts/run-with-preview-lock.mjs" \
    --lock-file "${LOCK_FILE}" \
    --timeout "${LOCK_TIMEOUT}" \
    -- /bin/bash "$0" "${ORIGINAL_ARGS[@]}" --skip-lock
fi

cd "${PROJECT_DIR}"
if [[ "${INSTALL_DEPS}" == "true" ]]; then
  export CI="${CI:-true}"
  corepack pnpm install --frozen-lockfile --store-dir "${PNPM_STORE_DIR:-${DOCS_PREVIEW_ROOT:-${PROJECT_DIR}/.local-preview}/.pnpm-store}"
fi
DOCS_PREVIEW_REASON="${REASON}" corepack pnpm docs:preview:publish

if [[ -n "${HEALTH_URL}" ]]; then
  corepack pnpm docs:preview:health -- --url "${HEALTH_URL}"
else
  corepack pnpm docs:preview:health
fi

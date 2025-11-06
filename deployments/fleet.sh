#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
export ROOT_DIR

COMPOSE_FILE="${COMPOSE_FILE:-${SCRIPT_DIR}/reactor.compose.yml}"
ENV_DIR="${ENV_DIR:-${SCRIPT_DIR}}"
ACTION="${1:-up}"

# Respect SUDO env; default to sudo, but preserve env with -E so ROOT_DIR reaches docker compose
RAW_SUDO="${SUDO:-sudo}"
SUDO_ENV_FLAG=""
if [[ "${RAW_SUDO}" == "sudo" ]]; then
  SUDO_ENV_FLAG="-E"
fi

compose() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    ${RAW_SUDO} ${SUDO_ENV_FLAG} docker compose "$@"
  else
    ${RAW_SUDO} ${SUDO_ENV_FLAG} docker-compose "$@"
  fi
}

printStep() { echo -e "\n\n[ $1 STARTED ]"; sleep 1; }

ENV_FILES=()
for ENVF in "${ENV_DIR}"/rx*.env; do
  [ -e "$ENVF" ] || continue
  ENV_FILES+=("$ENVF")
done

if [ ${#ENV_FILES[@]} -eq 0 ]; then
  echo "No env files found at ${ENV_DIR}/rx*.env — create rx001.env, rx002.env etc."
  exit 1
fi

project_from_env() { /usr/bin/env awk -F= '/^PROJECT=/{print $2}' "$1"; }

# Build-and-run wrapper to safely include all compose files (handles spaces in paths)
compose_run() {
  local project="$1"; shift
  local envf="$1"; shift
  local subcmd="$1"; shift

  # Build file list as an array (quotes preserve spaces)
  local files_args=()
  files_args+=(-f "${COMPOSE_FILE}")

  local override="${ENV_DIR}/${project}.plc.override.yml"
  if [[ -f "${override}" ]]; then
    files_args+=(-f "${override}")
  fi

  # Invoke docker compose with env, project, files, subcommand, and any extra args
  compose --env-file "${envf}" -p "${project}" "${files_args[@]}" "${subcmd}" "$@"
}

case "${ACTION}" in
  build)
    printStep "DOCKER_COMPOSE BUILD"
    for ENVF in "${ENV_FILES[@]}"; do
      PROJECT="$(project_from_env "$ENVF")"
      [ -n "$PROJECT" ] || PROJECT="$(basename "$ENVF" .env)"
      echo "→ build ${PROJECT}"
      compose_run "${PROJECT}" "${ENVF}" build
    done
    ;;

  up)
    printStep "DOCKER_COMPOSE BUILD"
    "$0" build
    printStep "STARTING REACTORS"
    for ENVF in "${ENV_FILES[@]}"; do
      PROJECT="$(project_from_env "$ENVF")"
      [ -n "$PROJECT" ] || PROJECT="$(basename "$ENVF" .env)"
      echo "→ ${PROJECT}  (env: $(basename "${ENVF}"))"
      compose_run "${PROJECT}" "${ENVF}" up -d
      compose_run "${PROJECT}" "${ENVF}" ps
    done
    ;;

  down)
    printStep "STOPPING REACTORS"
    for ENVF in "${ENV_FILES[@]}"; do
      PROJECT="$(project_from_env "$ENVF")"
      [ -n "$PROJECT" ] || PROJECT="$(basename "$ENVF" .env)"
      echo "→ ${PROJECT}"
      # best-effort; ignore errors if already down
      compose_run "${PROJECT}" "${ENVF}" down -v --remove-orphans || true
    done
    ;;

  restart)
    "$0" down
    "$0" up
    ;;

  ps)
    for ENVF in "${ENV_FILES[@]}"; do
      PROJECT="$(project_from_env "$ENVF")"
      [ -n "$PROJECT" ] || PROJECT="$(basename "$ENVF" .env)"
      echo -e "\n== ${PROJECT} =="
      compose_run "${PROJECT}" "${ENVF}" ps
    done
    ;;

  logs)
    for ENVF in "${ENV_FILES[@]}"; do
      PROJECT="$(project_from_env "$ENVF")"
      [ -n "$PROJECT" ] || PROJECT="$(basename "$ENVF" .env)"
      echo -e "\n== ${PROJECT} =="
      compose_run "${PROJECT}" "${ENVF}" logs --tail=50
    done
    ;;

  *)
    echo "Unknown action: ${ACTION}"; exit 1
    ;;
esac

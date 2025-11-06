#!/usr/bin/env bash
# Usage: ./monitor-component.sh <reactor-id> <service>
# Example: ./monitor-component.sh rx001 plc1
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Need 2 arguments: <reactor-id> <service>"; exit 1; fi

REACTOR="$1"
SERVICE="$2"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
SUDO_BIN="${SUDO:-sudo}"

compose() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    ${SUDO_BIN} docker compose "$@"
  else
    ${SUDO_BIN} docker-compose "$@"
  fi
}

compose -p "${REACTOR}" -f "${SCRIPT_DIR}/reactor.compose.yml" attach "${SERVICE}"

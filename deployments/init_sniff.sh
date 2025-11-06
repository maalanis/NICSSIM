#!/usr/bin/env bash
# Capture ICS traffic for a given reactor (default rx001)
# Usage: ./init_sniff.sh [reactor-id]
set -euo pipefail

PROJECT="${1:-rx001}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
SUDO_BIN="${SUDO:-sudo}"

# Find the linux bridge for the compose network "<project>_wnet"
NET_ID="$(${SUDO_BIN} docker network inspect -f '{{.Id}}' "${PROJECT}_wnet")"
BR_NAME="$(${SUDO_BIN} docker network inspect -f '{{ index .Options "com.docker.network.bridge.name" }}' "${PROJECT}_wnet")"
if [[ -z "${BR_NAME}" || "${BR_NAME}" == "<no value>" ]]; then
  BR_NAME="br-${NET_ID:0:12}"
fi

PCAP="traffic_${PROJECT}_ics.pcap"
echo "[ SNIFF ] Capturing on ${BR_NAME} → ${PCAP}"
exec ${SUDO_BIN} tcpdump -i "${BR_NAME}" -w "${PCAP}"

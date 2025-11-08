#!/usr/bin/env bash
set -euo pipefail

printStep(){ echo -e "\n\n[ $1 ]"; sleep 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
export ROOT_DIR

# Args:
#   $1 = number of reactors (rx001..rxNNN)
#   $2 = PLCs per reactor (default: 1)
FLEET_COUNT="${1:-}"
PLC_COUNT="${2:-1}"

BASE_COMPOSE="${SCRIPT_DIR}/reactor.compose.yml"   # used by 'extends.file'

# Ensure helpers executable
chmod +x "${SCRIPT_DIR}/fleet.sh"              2>/dev/null || true
chmod +x "${SCRIPT_DIR}/gen_envs.sh"           2>/dev/null || true
chmod +x "${SCRIPT_DIR}/monitor-component.sh"  2>/dev/null || true
chmod +x "${SCRIPT_DIR}/init_sniff.sh"         2>/dev/null || true

# If FLEET_COUNT provided, (re)generate rx*.env files (now aware of PLC_COUNT)
if [[ -n "${FLEET_COUNT}" ]]; then
  printStep "GENERATING ${FLEET_COUNT} REACTOR ENV FILES (PLC_COUNT=${PLC_COUNT})"
  "${SCRIPT_DIR}/gen_envs.sh" "${FLEET_COUNT}" "${PLC_COUNT}"
fi

# For each reactor, synthesize an override compose that adds plc2..plcN if needed
if [[ -n "${FLEET_COUNT}" ]]; then
  printStep "SYNTHESIZING PER-REACTOR PLC OVERRIDES"
  for i in $(seq 1 "${FLEET_COUNT}"); do
    PROJECT=$(printf "rx%03d" "$i")
    ENV_FILE="${SCRIPT_DIR}/${PROJECT}.env"
    OVERRIDE="${SCRIPT_DIR}/${PROJECT}.plc.override.yml"

    # If only 1 PLC, remove any stale override and continue
    if [[ "${PLC_COUNT}" -le 1 ]]; then
      [[ -f "${OVERRIDE}" ]] && rm -f "${OVERRIDE}"
      continue
    fi

    # Start override file header
    printf "services:\n" > "${OVERRIDE}"

    # Add plc2..plc${PLC_COUNT} extending plc1 from BASE_COMPOSE
    for n in $(seq 2 "${PLC_COUNT}"); do
      printf "  plc%s:\n" "${n}" >> "${OVERRIDE}"
      printf "    extends:\n" >> "${OVERRIDE}"
      printf "      file: %s\n" "${BASE_COMPOSE}" >> "${OVERRIDE}"
      printf "      service: plc1\n" >> "${OVERRIDE}"
      printf "    container_name: %s_plc%s\n" "${PROJECT}" "${n}" >> "${OVERRIDE}"
      printf "    environment:\n" >> "${OVERRIDE}"
      printf "      - PLC_ID=%s\n" "${n}" >> "${OVERRIDE}"
      printf "    networks:\n" >> "${OVERRIDE}"
      printf "      wnet:\n" >> "${OVERRIDE}"
      printf "        ipv4_address: \${ICS_PLC%s_IP}\n" "${n}" >> "${OVERRIDE}"
      printf "      fnet:\n" >> "${OVERRIDE}"
      printf "        ipv4_address: \${PHY_PLC%s_IP}\n" "${n}" >> "${OVERRIDE}"
    done
    echo "  → ${PROJECT}: wrote $(basename "${OVERRIDE}") with PLCs 2..${PLC_COUNT}"
  done
fi

# --- single-reactor default for no-args runs ---
SINGLE_TMP_ENV_DIR=""
if [[ -z "${FLEET_COUNT}" ]]; then
  # ensure rx001.env exists (generate if missing), respect PLC_COUNT default (1)
  [[ -f "${SCRIPT_DIR}/rx001.env" ]] || "${SCRIPT_DIR}/gen_envs.sh" 1 "${PLC_COUNT}"
  # prepare a temp ENV_DIR that contains ONLY rx001.env (so build/up only touches rx001)
  SINGLE_TMP_ENV_DIR="$(mktemp -d)"
  cp "${SCRIPT_DIR}/rx001.env" "${SINGLE_TMP_ENV_DIR}/"
fi

printStep "DEPLOYMENT STARTED"

printStep "DOWN PREVIOUS CONTAINERS (all reactors)"
# Find any running rx*** compose projects by container names, then bring them down.
PREV_PROJECTS="$(docker ps -a --format '{{.Names}}' \
  | sed -En 's/^(rx[0-9]{3})_.*/\1/p' | sort -u)"

if [ -n "${PREV_PROJECTS}" ]; then
  printStep "STOPPING REACTORS STARTED"
  for p in ${PREV_PROJECTS}; do
    echo "→ ${p}"
    docker compose -p "${p}" down -v --remove-orphans || true
  done
else
  echo "→ none found"
fi

printStep "PRUNING DOCKER"
${SUDO:-sudo} -E docker system prune -f || true

printStep "DOCKER_COMPOSE BUILD (fleet)"
if [[ -n "${SINGLE_TMP_ENV_DIR}" ]]; then
  ENV_DIR="${SINGLE_TMP_ENV_DIR}" "${SCRIPT_DIR}/fleet.sh" build
else
  "${SCRIPT_DIR}/fleet.sh" build
fi

printStep "DOCKER_COMPOSE UP (fleet)"
if [[ -n "${SINGLE_TMP_ENV_DIR}" ]]; then
  ENV_DIR="${SINGLE_TMP_ENV_DIR}" "${SCRIPT_DIR}/fleet.sh" up
else
  "${SCRIPT_DIR}/fleet.sh" up
fi

echo -e "\nAll set. Tips:"
echo " - Change fleet size:        ./init.sh 5            # deploy rx001..rx005 with 1 PLC each"
echo " - Customize PLCs per rx:    ./init.sh 4 3          # deploy 4 reactors, each with plc1..plc3"
echo " - See status:               ./fleet.sh ps"
echo " - View logs:                ./fleet.sh logs"
echo " - Tear down:                ./fleet.sh down"

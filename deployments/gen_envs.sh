#!/usr/bin/env bash
set -euo pipefail

# Usage: ./gen_envs.sh <count> [plc_count]
# Creates rx001.env ... rxNNN.env with unique ICS/PHY subnets and IPs.
# Also writes PLC_COUNT and per-PLC IPs (ICS_PLC{n}_IP / PHY_PLC{n}_IP).

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
COUNT="${1:-}"
PLC_COUNT="${2:-1}"

if [[ -z "${COUNT}" || ! "${COUNT}" =~ ^[0-9]+$ || "${COUNT}" -lt 1 ]]; then
  echo "Usage: $0 <count> [plc_count]"; exit 1
fi
if [[ -z "${PLC_COUNT}" || ! "${PLC_COUNT}" =~ ^[0-9]+$ || "${PLC_COUNT}" -lt 1 ]]; then
  echo "PLC count must be a positive integer"; exit 1
fi

# Clean existing envs to avoid surprises
rm -f "${SCRIPT_DIR}"/rx*.env

for i in $(seq 1 "${COUNT}"); do
  IDX=$(printf "%03d" "${i}")
  PROJECT="rx${IDX}"

  # Subnet scheme: per reactor i,
  #   ICS  -> 192.168.(10*i).0/24  (10,20,30,...)
  #   PHY  -> 192.168.(10*i+1).0/24 (11,21,31,...)
  ICS_OCT=$((10 * i))
  PHY_OCT=$((10 * i + 1))

  ICS_SUBNET="192.168.${ICS_OCT}.0/24"
  ICS_GATEWAY="192.168.${ICS_OCT}.1"
  PHY_SUBNET="192.168.${PHY_OCT}.0/24"
  PHY_GATEWAY="192.168.${PHY_OCT}.1"

  # Start env file
  cat > "${SCRIPT_DIR}/${PROJECT}.env" <<EOF
PROJECT=${PROJECT}
PLC_COUNT=${PLC_COUNT}

# Octets for convenience in other scripts
ICS_OCT=${ICS_OCT}
PHY_OCT=${PHY_OCT}

ICS_SUBNET=${ICS_SUBNET}
ICS_GATEWAY=${ICS_GATEWAY}
EOF

  # Emit PLC IPs (ICS: plc1=.11, plc2=.12, ... ; PHY: plc1=.11, plc2=.12, ...)
  for n in $(seq 1 "${PLC_COUNT}"); do
    host_octet=$((10 + n))
    echo "ICS_PLC${n}_IP=192.168.${ICS_OCT}.${host_octet}" >> "${SCRIPT_DIR}/${PROJECT}.env"
    echo "PHY_PLC${n}_IP=192.168.${PHY_OCT}.${host_octet}" >> "${SCRIPT_DIR}/${PROJECT}.env"
  done

  # HMIs & Attack infra (unchanged)
  cat >> "${SCRIPT_DIR}/${PROJECT}.env" <<EOF
ICS_HMI1_IP=192.168.${ICS_OCT}.21
ICS_HMI2_IP=192.168.${ICS_OCT}.22
ICS_HMI3_IP=192.168.${ICS_OCT}.23
ICS_ATTACKER_IP=192.168.${ICS_OCT}.42
ICS_ATTACKERMACHINE_IP=192.168.${ICS_OCT}.41
ICS_ATTACKERREMOTE_IP=192.168.${ICS_OCT}.43

PHY_SUBNET=${PHY_SUBNET}
PHY_GATEWAY=${PHY_GATEWAY}
PHY_PYS_IP=192.168.${PHY_OCT}.31
EOF

  echo "Generated ${PROJECT}.env (PLC_COUNT=${PLC_COUNT})"
done

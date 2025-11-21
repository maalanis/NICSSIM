#!/bin/bash

LOG_DIR="/src/logs/attack-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_LOG="${LOG_DIR}/collection_summary_${TIMESTAMP}.txt"

echo "==================================================" | tee -a $SUMMARY_LOG
echo "NICSSIM Attack Data Collection - Started: $(date)" | tee -a $SUMMARY_LOG
echo "==================================================" | tee -a $SUMMARY_LOG


log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $SUMMARY_LOG
}


run_attack() {
    local attack_name=$1
    shift
    log "Starting: $attack_name"
    if "$@"; then
        log "Completed: $attack_name ✓"
    else
        log "Failed: $attack_name ✗"
    fi
}


cooldown() {
    local seconds=$1
    log "Cooldown: ${seconds}s..."
    sleep $seconds
}

cd /src


log "PHASE 1: Network Reconnaissance Attacks"


for i in {1..5}; do
    TIMEOUT=$((5 + i*2))
    run_attack "Scapy Scan #$i (${TIMEOUT}s)" \
        python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/scan_scapy_run${i}_${TIMESTAMP}.txt \
        --attack scan --timeout $TIMEOUT --target 192.168.10.0/24
    cooldown 30
done


for i in {1..3}; do
    run_attack "Nmap Scan #$i" \
        nmap -p- -oN ${LOG_DIR}/scan_nmap_run${i}_${TIMESTAMP}.txt 192.168.10.1-255
    cooldown 30
done



log "PHASE 2: Traffic Manipulation Attacks"


for i in {1..5}; do
    REPLAY_COUNT=$((i * 2))
    run_attack "Replay Attack #$i (${REPLAY_COUNT}x)" \
        python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/replay_run${i}_${TIMESTAMP}.txt \
        --attack replay --timeout 20 --parameter $REPLAY_COUNT \
        --target 192.168.10.11,192.168.10.21
    cooldown 45
done


NOISE_LEVELS=(0.05 0.1 0.15 0.2)
for i in {0..3}; do
    NOISE=${NOISE_LEVELS[$i]}
    run_attack "MitM Attack #$((i+1)) (noise=${NOISE})" \
        python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/mitm_run$((i+1))_${TIMESTAMP}.txt \
        --attack mitm --timeout 60 --parameter $NOISE \
        --target 192.168.10.0/24
    cooldown 45
done


log "PHASE 3: DDoS Attacks (Varied Intensity)"


for i in {1..3}; do
    DURATION=$((i * 30))
    run_attack "DDoS Burst #$i (${DURATION}s)" \
        python3 DDosAgent.py Agent${i} \
        --timeout $DURATION --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_burst${i}_${TIMESTAMP}.txt
    cooldown 60
done


log "Starting sustained DDoS attack (10 minutes)..."
run_attack "DDoS Sustained (600s)" \
    python3 DDosAgent.py AgentSustained \
    --timeout 600 --target 192.168.10.11 \
    --log_path ${LOG_DIR}/ddos_sustained_${TIMESTAMP}.txt
cooldown 60


log "PHASE 4: Coordinated Multi-Vector Attacks"


log "Starting coordinated attack: DDoS + MitM"
(
    python3 DDosAgent.py AgentCoord1 \
        --timeout 300 --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_coordinated1_${TIMESTAMP}.txt &
    
    sleep 5
    
    python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/mitm_coordinated1_${TIMESTAMP}.txt \
        --attack mitm --timeout 300 --parameter 0.15 \
        --target 192.168.10.0/24 &
    
    wait
)
log "Coordinated attack #1 completed"
cooldown 120


log "Starting coordinated attack #2: DDoS + MitM (higher intensity)"
(
    python3 DDosAgent.py AgentCoord2 \
        --timeout 300 --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_coordinated2_${TIMESTAMP}.txt &
    
    sleep 5
    
    python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/mitm_coordinated2_${TIMESTAMP}.txt \
        --attack mitm --timeout 300 --parameter 0.2 \
        --target 192.168.10.0/24 &
    
    wait
)
log "Coordinated attack #2 completed"

echo "==================================================" | tee -a $SUMMARY_LOG
log "Attack data collection COMPLETED!"
log "Total runtime: ~60 minutes"
log "Generated attack samples:"
ls -lh ${LOG_DIR}/*${TIMESTAMP}* | wc -l | xargs -I {} echo "  - {} attack log files" | tee -a $SUMMARY_LOG
du -sh ${LOG_DIR} | awk '{print "  - Total size: " $1}' | tee -a $SUMMARY_LOG
echo "==================================================" | tee -a $SUMMARY_LOG
echo "Summary saved to: $SUMMARY_LOG"

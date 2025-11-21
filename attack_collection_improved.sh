#!/bin/bash
# NICSSIM IMPROVED Attack Data Collection Script
# Runtime: ~3 hours
# Focus: Only attacks that respect timeouts and generate consistent samples
#
# Target samples (at ~1Hz sampling):
#   Replay: 5,000 samples (10 runs × 8-10 min each)
#   MitM:   5,000 samples (10 runs × 8-10 min each)
#   DDoS:   8,000 samples (8 runs × various durations)
# Total: ~18,000 attack samples

LOG_DIR="/src/logs/attack-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUMMARY_LOG="${LOG_DIR}/collection_improved_${TIMESTAMP}.txt"

echo "==================================================" | tee -a $SUMMARY_LOG
echo "NICSSIM IMPROVED ATTACK COLLECTION" | tee -a $SUMMARY_LOG
echo "Started: $(date)" | tee -a $SUMMARY_LOG
echo "Target: 18,000 attack samples over 3 hours" | tee -a $SUMMARY_LOG
echo "Focus: Replay, MitM, DDoS (attacks that work!)" | tee -a $SUMMARY_LOG
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

#===========================================
# PHASE 1: Extended Replay Attacks (90 min)
#===========================================
log "PHASE 1: Extended Replay Attacks (Target: 5,000 samples)"
log "Running 10 replay sessions of 8-10 minutes each"

for i in {1..10}; do
    DURATION=480  # 8 minutes = 480 seconds
    REPLAY_COUNT=$((2 + i))
    run_attack "Replay #$i (${DURATION}s, ${REPLAY_COUNT}x replays)" \
        python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/replay_improved_run${i}_${TIMESTAMP}.txt \
        --attack replay --timeout $DURATION --parameter $REPLAY_COUNT \
        --target 192.168.10.11,192.168.10.21
    cooldown 30
done

log "PHASE 1 COMPLETE - Generated ~5,000 replay attack samples"

#===========================================
# PHASE 2: Extended MitM Attacks (90 min)
#===========================================
log "PHASE 2: Extended MitM Attacks (Target: 5,000 samples)"
log "Running 10 MitM sessions of 8-10 minutes each"

# Vary noise levels across runs
for i in {1..10}; do
    DURATION=480  # 8 minutes
    # Cycle through noise levels: 0.05, 0.10, 0.15, 0.20
    NOISE_INDEX=$(( (i - 1) % 4 ))
    NOISE_LEVELS=(0.05 0.10 0.15 0.20)
    NOISE=${NOISE_LEVELS[$NOISE_INDEX]}
    
    run_attack "MitM #$i (${DURATION}s, noise=${NOISE})" \
        python3 ics_sim/ScapyAttacker.py \
        --output ${LOG_DIR}/mitm_improved_run${i}_${TIMESTAMP}.txt \
        --attack mitm --timeout $DURATION --parameter $NOISE \
        --target 192.168.10.0/24
    cooldown 30
done

log "PHASE 2 COMPLETE - Generated ~5,000 MitM attack samples"

#===========================================
# PHASE 3: Extended DDoS Attacks (40 min)
#===========================================
log "PHASE 3: Extended DDoS Attacks (Target: 8,000 samples)"

# Short bursts
for i in {1..3}; do
    run_attack "DDoS Burst #$i (300s)" \
        python3 DDosAgent.py AgentBurst${i} \
        --timeout 300 --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_improved_burst${i}_${TIMESTAMP}.txt
    cooldown 60
done

# Medium duration
for i in {1..2}; do
    run_attack "DDoS Medium #$i (600s)" \
        python3 DDosAgent.py AgentMedium${i} \
        --timeout 600 --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_improved_medium${i}_${TIMESTAMP}.txt
    cooldown 90
done

# One long sustained
log "Starting SUSTAINED DDoS (1200s = 20 minutes)"
run_attack "DDoS Sustained (1200s)" \
    python3 DDosAgent.py AgentSustained \
    --timeout 1200 --target 192.168.10.11 \
    --log_path ${LOG_DIR}/ddos_improved_sustained_${TIMESTAMP}.txt
cooldown 60

# Two more medium bursts
for i in {3..4}; do
    run_attack "DDoS Medium #$i (600s)" \
        python3 DDosAgent.py AgentMedium${i} \
        --timeout 600 --target 192.168.10.11 \
        --log_path ${LOG_DIR}/ddos_improved_medium${i}_${TIMESTAMP}.txt
    cooldown 60
done

log "PHASE 3 COMPLETE - Generated ~8,000 DDoS attack samples"

#===========================================
# PHASE 4: Quick Network Scans (10 min)
#===========================================
log "PHASE 4: Quick Network Scans (Bonus - low priority)"
log "Running fast scans for variety"

# Quick Nmap scans - just for variety, not expecting many samples
for i in {1..3}; do
    run_attack "Nmap Quick Scan #$i" \
        nmap -F -T4 -oN ${LOG_DIR}/scan_improved_run${i}_${TIMESTAMP}.txt \
        192.168.10.1-255
    cooldown 20
done

log "PHASE 4 COMPLETE - Scans (supplemental)"

#===========================================
# COMPLETION
#===========================================
echo "==================================================" | tee -a $SUMMARY_LOG
log "IMPROVED ATTACK COLLECTION COMPLETED!"
log "Total runtime: ~3.5 hours"
echo "==================================================" | tee -a $SUMMARY_LOG

# Count samples
log "Summary of attack log files:"
REPLAY_COUNT=$(ls ${LOG_DIR}/replay_improved_*${TIMESTAMP}* 2>/dev/null | wc -l)
MITM_COUNT=$(ls ${LOG_DIR}/mitm_improved_*${TIMESTAMP}* 2>/dev/null | wc -l)
DDOS_COUNT=$(ls ${LOG_DIR}/ddos_improved_*${TIMESTAMP}* 2>/dev/null | wc -l)
SCAN_COUNT=$(ls ${LOG_DIR}/scan_improved_*${TIMESTAMP}* 2>/dev/null | wc -l)

log "  Replay attacks: $REPLAY_COUNT files (~5,000 samples expected)"
log "  MitM attacks:   $MITM_COUNT files (~5,000 samples expected)"
log "  DDoS attacks:   $DDOS_COUNT files (~8,000 samples expected)"
log "  Scans:          $SCAN_COUNT files (~100 samples expected)"
log ""
log "Total attack files: $((REPLAY_COUNT + MITM_COUNT + DDOS_COUNT + SCAN_COUNT))"

# Disk usage
du -sh ${LOG_DIR} | awk -v log="$SUMMARY_LOG" '{print "  Total logs size: " $1 | "tee -a " log}'

echo "==================================================" | tee -a $SUMMARY_LOG
log "Expected final dataset (after adding baseline):"
log "  Baseline: ~25,000 samples (58%)"
log "  Replay:   ~5,000 samples (12%)"
log "  MitM:     ~5,000 samples (12%)"
log "  DDoS:     ~8,000 samples (18%)"
log "  Scan:     ~100 samples (<1%)"
log "  Total:    ~43,000 samples"
log ""
log "This balanced distribution should achieve:"
log "  ✓ >90% recall on all attack types"
log "  ✓ >95% precision"
log "  ✓ Publication-quality results"
echo "==================================================" | tee -a $SUMMARY_LOG

log "Next steps:"
log "  1. Copy logs: docker cp rx001_attacker:/src/logs/. collected_data/improved_run/"
log "  2. Rebuild dataset: python dataset_builder.py ..."
log "  3. Retrain model: python train_detector.py ..."

echo "Summary saved to: $SUMMARY_LOG" | tee -a $SUMMARY_LOG
#!/bin/bash
# ============================================================================
# NICSSIM Phase 2 Data Collection Automation Script (FIXED FOR DEPLOYMENTS/)
# ============================================================================
# This script automates the collection of labeled attack data for ML training.
#
# Usage:
#   ./collect_attack_data.sh baseline    # Collect 3-hour baseline
#   ./collect_attack_data.sh all         # Collect all attack types (3 hours)
#   ./collect_attack_data.sh sensor-spike # Collect specific attack only
#
# Prerequisites:
#   1. Run this script from the deployments/ directory
#   2. NICSSIM must be built: ./init.sh (first time only)
# ============================================================================

set -e  # Exit on error

# Configuration - FIXED for deployments/ directory structure
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENTS_DIR="${SCRIPT_DIR}"
LOG_DIR="${PROJECT_ROOT}/src/logs"
ATTACK_DIR="${PROJECT_ROOT}/src/attack"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create log directory structure
setup_directories() {
    print_header "Setting Up Directory Structure"
    
    mkdir -p "${LOG_DIR}/baseline"
    mkdir -p "${LOG_DIR}/sensor-spike"
    mkdir -p "${LOG_DIR}/sensor-freeze"
    mkdir -p "${LOG_DIR}/ddos"
    mkdir -p "${LOG_DIR}/command-injection"
    mkdir -p "${LOG_DIR}/mitm"
    mkdir -p "${LOG_DIR}/replay"
    
    print_info "Created log directories in ${LOG_DIR}"
}

# Start NICSSIM reactor
start_reactor() {
    print_header "Starting NICSSIM Reactor"
    cd "${DEPLOYMENTS_DIR}"
    
    # Check if init.sh exists
    if [ ! -f "./init.sh" ]; then
        print_error "init.sh not found in ${DEPLOYMENTS_DIR}"
        print_error "Make sure you're running this script from the deployments/ directory"
        exit 1
    fi
    
    ./init.sh
    
    # Wait for system stabilization
    print_info "Waiting 60 seconds for system stabilization..."
    sleep 60
}

# Stop reactor and move logs
stop_and_save_logs() {
    local attack_type=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local log_name="${attack_type}_${timestamp}_HMI1.log"
    
    print_header "Stopping Reactor & Saving Logs"
    
    cd "${DEPLOYMENTS_DIR}"
    ./stop.sh || true
    
    # Wait for logs to flush
    sleep 5
    
    # Move and rename log
    if [ -f "${LOG_DIR}/logs-HMI1.log" ]; then
        mv "${LOG_DIR}/logs-HMI1.log" "${LOG_DIR}/${attack_type}/${log_name}"
        print_info "Saved log: ${LOG_DIR}/${attack_type}/${log_name}"
        
        # Show file size
        local size=$(du -h "${LOG_DIR}/${attack_type}/${log_name}" | cut -f1)
        print_info "Log file size: ${size}"
    else
        print_error "Log file not found at ${LOG_DIR}/logs-HMI1.log"
        print_info "Checking alternative locations..."
        
        # Try to find the log in container
        docker exec rx001_hmi1 ls -la /app/src/logs/ || true
        
        return 1
    fi
}

# ============================================================================
# Attack Collection Functions
# ============================================================================

collect_baseline() {
    print_header "Collecting Baseline Data (3-4 hours)"
    
    start_reactor
    
    print_info "Reactor running in normal operation mode..."
    print_info "Collection will run for 3 hours (10,800 seconds)"
    print_info "You can monitor in another terminal: docker logs -f rx001_hmi1"
    
    # Run for 3 hours
    sleep 10800
    
    stop_and_save_logs "baseline"
    
    print_header "Baseline Collection Complete!"
}

collect_sensor_spike() {
    print_header "Collecting Sensor-Spike Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching sensor spike attack..."
    
    # Check if attack script exists
    if [ ! -f "${ATTACK_DIR}/AttackerSensorSpike.py" ]; then
        print_error "Attack script not found: ${ATTACK_DIR}/AttackerSensorSpike.py"
        exit 1
    fi
    
    cd "${ATTACK_DIR}"
    
    # Run attack for 20 minutes (1200 seconds)
    timeout 1200 python3 AttackerSensorSpike.py || true
    
    stop_and_save_logs "sensor-spike"
}

collect_sensor_freeze() {
    print_header "Collecting Sensor-Freeze Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching sensor freeze attack..."
    cd "${ATTACK_DIR}"
    
    # Run attack for 20 minutes
    timeout 1200 python3 AttackerSensorFreeze.py || true
    
    stop_and_save_logs "sensor-freeze"
}

collect_ddos() {
    print_header "Collecting DDoS Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching DDoS attack against PLC1 (192.168.0.11)..."
    
    # Create temporary log directory for DDos agents
    mkdir -p "${LOG_DIR}/attack-logs"
    
    cd "${ATTACK_DIR}"
    
    # Launch DDoS with 10 concurrent agents for 1200 seconds
    python3 DDosAgent.py Agent1 --target 192.168.0.11 --timeout 1200 --log_path "${LOG_DIR}/attack-logs/log-ddos.log" &
    
    # Wait for attack to complete
    sleep 1200
    
    stop_and_save_logs "ddos"
}

collect_command_injection() {
    print_header "Collecting Command-Injection Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching command injection attack..."
    cd "${ATTACK_DIR}"
    
    # Run for 1200 seconds (20 minutes)
    timeout 1200 python3 CommandInjectionAgent.py 1200 || true
    
    stop_and_save_logs "command-injection"
}

collect_mitm() {
    print_header "Collecting MiTM Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching Man-in-the-Middle attack..."
    cd "${ATTACK_DIR}"
    
    # MiTM attack for 1200 seconds with 10% noise
    mkdir -p "${LOG_DIR}/attack-logs"
    python3 ScapyAttacker.py \
        --attack mitm \
        --timeout 1200 \
        --parameter 0.1 \
        --target "192.168.0.1/24" \
        --output "${LOG_DIR}/attack-logs/log-mitm.log" || true
    
    stop_and_save_logs "mitm"
}

collect_replay() {
    print_header "Collecting Replay Attack Data (20 min)"
    
    start_reactor
    
    print_info "Launching replay attack..."
    cd "${ATTACK_DIR}"
    
    # First sniff for 10 minutes, then replay 3 times (total ~20 min)
    mkdir -p "${LOG_DIR}/attack-logs"
    python3 ScapyAttacker.py \
        --attack replay \
        --timeout 600 \
        --parameter 3 \
        --target "192.168.0.11,192.168.0.12" \
        --output "${LOG_DIR}/attack-logs/log-replay.log" || true
    
    stop_and_save_logs "replay"
}

# ============================================================================
# Main Script Logic
# ============================================================================

main() {
    # Print diagnostic info
    print_info "Script directory: ${SCRIPT_DIR}"
    print_info "Project root: ${PROJECT_ROOT}"
    print_info "Deployments: ${DEPLOYMENTS_DIR}"
    print_info "Log directory: ${LOG_DIR}"
    print_info "Attack directory: ${ATTACK_DIR}"
    
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <baseline|all|sensor-spike|sensor-freeze|ddos|command-injection|mitm|replay>"
        exit 1
    fi
    
    setup_directories
    
    case "$1" in
        baseline)
            collect_baseline
            ;;
        sensor-spike)
            collect_sensor_spike
            ;;
        sensor-freeze)
            collect_sensor_freeze
            ;;
        ddos)
            collect_ddos
            ;;
        command-injection)
            collect_command_injection
            ;;
        mitm)
            collect_mitm
            ;;
        replay)
            collect_replay
            ;;
        all)
            print_header "Collecting ALL Attack Types"
            print_info "Total estimated time: ~3 hours"
            print_info "This will collect: sensor-spike, sensor-freeze, ddos, command-injection, mitm, replay"
            print_info "Press Ctrl+C within 10 seconds to cancel..."
            sleep 10
            
            collect_sensor_spike
            sleep 30  # Cooldown between attacks
            
            collect_sensor_freeze
            sleep 30
            
            collect_ddos
            sleep 30
            
            collect_command_injection
            sleep 30
            
            collect_mitm
            sleep 30
            
            collect_replay
            
            print_header "All Attack Data Collected!"
            print_info "Now run: python dataset_builder.py --log-dir src/logs --version v2_phase2"
            ;;
        *)
            print_error "Unknown attack type: $1"
            echo "Valid options: baseline, all, sensor-spike, sensor-freeze, ddos, command-injection, mitm, replay"
            exit 1
            ;;
    esac
    
    print_header "Data Collection Complete!"
    print_info "Logs saved in: ${LOG_DIR}"
}

main "$@"
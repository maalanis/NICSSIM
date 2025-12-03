#!/usr/bin/env python3
"""
DefenderService.py

Real-time anomaly detection service that monitors HMI1 logs
and generates alerts when attacks are detected.
"""

import os
import time
import pickle
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
import logging

# Import your existing parser
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from log_parser import HMI1LogParser

# Feature columns (must match training)
FEATURE_COLS = [
    'flux', 'temp_out', 'pressure_core', 'flow',
    'pressure_sg_in', 'sg_level', 'fw_flow',
    'temp_diff', 'pressure_diff', 'flux_error'
]

class DefenderService:
    """Real-time anomaly detection service for NICSSIM."""
    
    def __init__(self, model_path, scaler_path, baseline_stats_path):
        """Initialize defender with trained model."""
        
        # Load trained model
        print("Loading trained detector...")
        with open(model_path, 'rb') as f:
            self.clf = pickle.load(f)
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        with open(baseline_stats_path, 'r') as f:
            self.baseline_stats = json.load(f)
        
        print(f" Loaded Isolation Forest detector")
        print(f"   Baseline: {self.baseline_stats['sample_count']} samples")
        
        # Initialize parser
        self.parser = HMI1LogParser()
        
        # Detection statistics
        self.total_samples = 0
        self.anomaly_count = 0
        self.alert_history = []
        
        # Setup logging
        self.setup_logging()
        
    def setup_logging(self):
        """Setup detection logging."""
        log_dir = "src/logs/defender"
        os.makedirs(log_dir, exist_ok=True)
        
        # Detection log
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.detection_log_path = os.path.join(log_dir, f"detections_{timestamp}.csv")
        
        # Write header
        with open(self.detection_log_path, 'w') as f:
            f.write("timestamp,is_anomaly,anomaly_score,flux,temp_out,pressure_core,sg_level\n")
        
        print(f" Logging detections to: {self.detection_log_path}")
    
    def add_derived_features(self, data):
        """Add derived features to match training data."""
        data['temp_diff'] = data['temp_out'] - data['temp_in']
        data['pressure_diff'] = data['pressure_core'] - data['pressure_sg_in']
        data['flux_error'] = data['flux'] - data['flux_sp']
        return data
    
    def detect_anomaly(self, sample_dict):
        """
        Detect if a single sample is anomalous.
        
        Args:
            sample_dict: Dictionary of sensor values from parser
            
        Returns:
            (is_anomaly, anomaly_score)
        """
        # Add derived features
        sample_dict = self.add_derived_features(sample_dict)
        
        # Extract features in correct order
        features = [sample_dict[col] for col in FEATURE_COLS]
        X = [features]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict (-1 = anomaly, 1 = normal)
        prediction = self.clf.predict(X_scaled)[0]
        
        # Get anomaly score (lower = more anomalous)
        score = self.clf.score_samples(X_scaled)[0]
        
        is_anomaly = (prediction == -1)
        
        return is_anomaly, score
    
    def log_detection(self, timestamp, is_anomaly, score, sample):
        """Log detection result."""
        with open(self.detection_log_path, 'a') as f:
            f.write(f"{timestamp},{int(is_anomaly)},{score:.4f},"
                   f"{sample['flux']:.3f},{sample['temp_out']:.3f},"
                   f"{sample['pressure_core']:.3f},{sample['sg_level']:.3f}\n")
    
    def generate_alert(self, timestamp, score, sample):
        """Generate alert for detected anomaly."""
        alert = {
            'timestamp': str(timestamp),
            'anomaly_score': float(score),
            'sensors': {
                'flux': sample['flux'],
                'temp_out': sample['temp_out'],
                'pressure_core': sample['pressure_core'],
                'sg_level': sample['sg_level']
            }
        }
        
        self.alert_history.append(alert)
        
        # Print alert
        print(f"\n ANOMALY DETECTED at {timestamp}")
        print(f"   Anomaly score: {score:.4f}")
        print(f"   Flux: {sample['flux']:.3f} (baseline: {self.baseline_stats['sensors']['flux']['mean']:.3f})")
        print(f"   Temp: {sample['temp_out']:.1f}K (baseline: {self.baseline_stats['sensors']['temp_out']['mean']:.1f}K)")
        print(f"   Pressure: {sample['pressure_core']:.2f} bar")
        
        return alert
    
    def monitor_log_file(self, log_file_path, follow=True, interval=1.0):
        """
        Monitor HMI1 log file for anomalies.
        
        Args:
            log_file_path: Path to HMI1 log file
            follow: If True, continuously monitor (like tail -f)
            interval: Polling interval in seconds
        """
        print(f"\n Starting real-time monitoring...")
        print(f" Monitoring: {log_file_path}")
        print(f"  Polling interval: {interval}s")
        print(f"{'='*60}\n")
        
        # Open log file
        with open(log_file_path, 'r') as f:
            # Skip to end if following
            if follow:
                f.seek(0, 2)  # Seek to end of file
            
            line_count = 0
            
            try:
                while True:
                    line = f.readline()
                    
                    if not line:
                        if not follow:
                            break  # End of file, stop if not following
                        time.sleep(interval)
                        continue
                    
                    # Parse line
                    sample = self.parser.parse_line(line)
                    if not sample:
                        continue
                    
                    # Detect anomaly
                    is_anomaly, score = self.detect_anomaly(sample)
                    
                    # Update statistics
                    self.total_samples += 1
                    if is_anomaly:
                        self.anomaly_count += 1
                        self.generate_alert(sample['timestamp'], score, sample)
                    
                    # Log detection
                    self.log_detection(sample['timestamp'], is_anomaly, score, sample)
                    
                    # Periodic status update
                    line_count += 1
                    if line_count % 100 == 0:
                        anomaly_rate = (self.anomaly_count / self.total_samples * 100) if self.total_samples > 0 else 0
                        print(f"✓ Processed {self.total_samples} samples | "
                            f"Anomalies: {self.anomaly_count} ({anomaly_rate:.2f}%)")

            except KeyboardInterrupt:
                print("\n\n⏹️  Monitoring stopped by user")

            finally:
                # ALWAYS print summary, whether completed or interrupted
                self.print_summary()
                
    def print_summary(self):
        """Print detection summary."""
        print(f"\n{'='*60}")
        print(f" DETECTION SUMMARY")
        print(f"{'='*60}")
        print(f"Total samples processed: {self.total_samples}")
        print(f"Anomalies detected: {self.anomaly_count}")
        
        if self.total_samples > 0:
            anomaly_rate = self.anomaly_count / self.total_samples * 100
            print(f"Anomaly rate: {anomaly_rate:.2f}%")
        
        print(f"\n Detection log saved to: {self.detection_log_path}")
        
        if self.alert_history:
            print(f"\n Recent alerts:")
            for alert in self.alert_history[-5:]:
                print(f"   {alert['timestamp']} - Score: {alert['anomaly_score']:.4f}")


def main():
    """Example usage: Monitor a log file."""
    
    # Paths to trained model
    model_path = "src/defender/isolation_forest.pkl"
    scaler_path = "src/defender/scaler.pkl"
    baseline_stats_path = "src/defender/baseline_stats.json"
    
    # Initialize defender
    defender = DefenderService(model_path, scaler_path, baseline_stats_path)
    
    # Example 1: Test on your baseline data (should have low anomaly rate)
    print("\n TEST MODE: Analyzing baseline data...")
    baseline_log = "src/logs/baseline_production_clean.log"
    
    if os.path.exists(baseline_log):
        defender.monitor_log_file(baseline_log, follow=False)
    else:
        print(f"Baseline log not found: {baseline_log}")
    
    # Example 2: Real-time monitoring (uncomment to use)
    # print("\n LIVE MODE: Monitoring real-time logs...")
    # live_log = "src/logs/HMI1.log"  # Path to live HMI1 log
    # defender.monitor_log_file(live_log, follow=True, interval=0.5)


if __name__ == "__main__":
    main()
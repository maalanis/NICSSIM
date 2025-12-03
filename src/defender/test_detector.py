#!/usr/bin/env python3
"""
test_detector.py
Test trained detector on baseline data to measure false positive rate.
"""

import pandas as pd
import pickle
import json
from train_detector import add_derived_features, FEATURE_COLS

def load_detector():
    """Load trained model and scaler."""
    with open("src/defender/isolation_forest.pkl", 'rb') as f:
        clf = pickle.load(f)
    with open("src/defender/scaler.pkl", 'rb') as f:
        scaler = pickle.load(f)
    with open("src/defender/baseline_stats.json", 'r') as f:
        baseline_stats = json.load(f)
    return clf, scaler, baseline_stats

def detect_3sigma(df, baseline_stats):
    """Simple 3-sigma threshold detector."""
    anomalies = []
    
    for sensor, stats in baseline_stats['sensors'].items():
        if sensor in df.columns:
            lower = stats['lower_3sigma']
            upper = stats['upper_3sigma']
            mask = (df[sensor] < lower) | (df[sensor] > upper)
            anomalies.append(mask)
    
    # Anomaly if ANY sensor exceeds 3-sigma
    combined = pd.concat(anomalies, axis=1).any(axis=1)
    return combined

def test_on_baseline(csv_path):
    """Test both detectors on baseline data."""
    
    # Load detector and baseline
    clf, scaler, baseline_stats = load_detector()
    df = pd.read_csv(csv_path, index_col=0, parse_dates=True)
    df = add_derived_features(df)
    
    # Isolation Forest detection
    X = df[FEATURE_COLS].values
    X_scaled = scaler.transform(X)
    predictions_if = clf.predict(X_scaled)
    anomalies_if = (predictions_if == -1)
    
    # 3-sigma detection
    anomalies_3sigma = detect_3sigma(df, baseline_stats)
    
    # Calculate metrics
    print("\n Detection Performance on Baseline Data:")
    print(f"   Total samples: {len(df)}")
    print(f"\n   Isolation Forest:")
    print(f"     False positives: {anomalies_if.sum()} ({anomalies_if.sum()/len(df)*100:.2f}%)")
    print(f"     Target: <2%")
    print(f"\n   3-Sigma Threshold:")
    print(f"     False positives: {anomalies_3sigma.sum()} ({anomalies_3sigma.sum()/len(df)*100:.2f}%)")
    print(f"     Target: <2%")
    
    return anomalies_if, anomalies_3sigma

if __name__ == "__main__":
    baseline_path = "src/logs/baseline_production.csv"
    test_on_baseline(baseline_path)
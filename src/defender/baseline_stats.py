#!/usr/bin/env python3
"""
baseline_stats.py
Calculate and save baseline statistics for anomaly detection.
"""

import pandas as pd
import json
import numpy as np

def calculate_baseline_stats(csv_path):
    """Calculate mean, std, min, max for each sensor."""
    
    df = pd.read_csv(csv_path, index_col=0, parse_dates=True)
    
    # Sensors to monitor for anomaly detection
    sensors = [
        'flux', 'temp_in', 'temp_out', 'pressure_core', 'flow',
        'pressure_sg_in', 'radiation', 'sg_temp_in', 'sg_temp_out',
        'sg_pressure', 'sg_level', 'fw_flow'
    ]
    
    stats = {}
    
    for sensor in sensors:
        if sensor in df.columns:
            stats[sensor] = {
                'mean': float(df[sensor].mean()),
                'std': float(df[sensor].std()),
                'min': float(df[sensor].min()),
                'max': float(df[sensor].max()),
                'median': float(df[sensor].median()),
                # 3-sigma thresholds for anomaly detection
                'lower_3sigma': float(df[sensor].mean() - 3*df[sensor].std()),
                'upper_3sigma': float(df[sensor].mean() + 3*df[sensor].std())
            }
    
    return {
        'sample_count': len(df),
        'time_range': {
            'start': str(df.index.min()),
            'end': str(df.index.max())
        },
        'sensors': stats
    }

if __name__ == "__main__":
    # Load your production baseline
    baseline_path = "src/logs/baseline_production.csv"
    
    print("Calculating baseline statistics...")
    baseline_stats = calculate_baseline_stats(baseline_path)
    
    # Save to JSON
    output_path = "src/defender/baseline_stats.json"
    with open(output_path, 'w') as f:
        json.dump(baseline_stats, f, indent=2)
    
    print(f"✅ Saved baseline statistics to {output_path}")
    print(f"\nBaseline summary:")
    print(f"  Samples: {baseline_stats['sample_count']}")
    print(f"  Time range: {baseline_stats['time_range']['start']} to {baseline_stats['time_range']['end']}")
    print(f"  Sensors: {len(baseline_stats['sensors'])}")
    
    # Show example stats for key sensors
    print("\n Key sensor baselines:")
    for sensor in ['flux', 'temp_out', 'pressure_core', 'sg_level']:
        s = baseline_stats['sensors'][sensor]
        print(f"  {sensor}: {s['mean']:.3f} ± {s['std']:.3f} (3σ: [{s['lower_3sigma']:.3f}, {s['upper_3sigma']:.3f}])")
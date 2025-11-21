#!/usr/bin/env python3
"""
dataset_builder.py

Build labeled ML dataset by matching attack timestamps to sensor readings.
Creates train/val/test splits with balanced attack samples.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import json
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from log_parser import FactoryLogParser, add_derived_features


# Attack type labels
ATTACK_LABELS = {
    'baseline': 0,
    'scan': 1,      # Network scans (Scapy, Nmap)
    'replay': 2,    # Replay attacks
    'mitm': 3,      # Man-in-the-Middle attacks
    'ddos': 4       # DDoS attacks
}


class AttackTimelineParser:
    """Parse attack summary file to extract attack time windows."""
    
    def __init__(self, summary_file):
        self.summary_file = summary_file
        self.attack_windows = []
        
    def parse_summary(self):
        """
        Parse collection_summary_*.txt to extract attack windows.
        
        Returns:
            list: [(start_time, end_time, attack_type), ...]
        """
        with open(self.summary_file, 'r') as f:
            lines = f.readlines()
        
        current_attack = None
        start_time = None
        
        for line in lines:
            line = line.strip()
            
            # Match "Starting: Attack Name" lines
            if 'Starting:' in line:
                # Extract timestamp [YYYY-MM-DD HH:MM:SS]
                ts_match = line.split('[')[1].split(']')[0]
                start_time = datetime.strptime(ts_match, '%Y-%m-%d %H:%M:%S')
                
                # Determine attack type from name
                if 'Scapy Scan' in line or 'Nmap Scan' in line or 'Quick Scan' in line:
                    current_attack = 'scan'
                elif 'Replay' in line:  # Matches both "Replay Attack" and "Replay #"
                    current_attack = 'replay'
                elif 'MitM' in line:  # Matches both "MitM Attack" and "MitM #"
                    current_attack = 'mitm'
                elif 'DDoS' in line:
                    current_attack = 'ddos'
            
            # Match "Completed: Attack Name" lines
            elif 'Completed:' in line and current_attack and start_time:
                ts_match = line.split('[')[1].split(']')[0]
                end_time = datetime.strptime(ts_match, '%Y-%m-%d %H:%M:%S')
                
                self.attack_windows.append((start_time, end_time, current_attack))
                current_attack = None
                start_time = None
        
        return self.attack_windows
    
    def print_summary(self):
        """Print attack timeline summary."""
        print(f"\n{'='*70}")
        print(f"ATTACK TIMELINE SUMMARY")
        print(f"{'='*70}")
        print(f"Total attacks: {len(self.attack_windows)}")
        
        # Count by type
        attack_counts = {}
        for _, _, attack_type in self.attack_windows:
            attack_counts[attack_type] = attack_counts.get(attack_type, 0) + 1
        
        print("\nAttacks by type:")
        for attack_type, count in sorted(attack_counts.items()):
            print(f"  {attack_type:15s}: {count} attacks")
        
        print("\nAttack timeline:")
        for start, end, attack_type in self.attack_windows:
            duration = (end - start).total_seconds()
            print(f"  {start.strftime('%H:%M:%S')} - {end.strftime('%H:%M:%S')} "
                  f"({duration:3.0f}s): {attack_type}")


class DatasetBuilder:
    """Build labeled ML dataset from sensor logs and attack timeline."""
    
    def __init__(self, factory_log, summary_file):
        self.factory_log = factory_log
        self.summary_file = summary_file
        
        # Parse data
        print("Parsing Factory sensor log...")
        parser = FactoryLogParser()
        self.sensor_df = parser.parse_file(factory_log)
        print(f"  ✓ Loaded {len(self.sensor_df):,} sensor readings")
        
        # Parse attack timeline
        print("\nParsing attack timeline...")
        timeline_parser = AttackTimelineParser(summary_file)
        self.attack_windows = timeline_parser.parse_summary()
        timeline_parser.print_summary()
    
    def label_data(self):
        """
        Label each sensor reading based on attack timeline.
        
        Returns:
            pd.DataFrame: Sensor data with 'attack_label' column
        """
        print(f"\n{'='*70}")
        print("LABELING SENSOR DATA")
        print(f"{'='*70}")
        
        # Initialize all as baseline
        labels = np.zeros(len(self.sensor_df), dtype=int)
        
        # Label attack periods
        for start_time, end_time, attack_type in self.attack_windows:
            # Find sensor readings in this time window
            mask = (self.sensor_df.index >= start_time) & (self.sensor_df.index <= end_time)
            count = mask.sum()
            
            if count > 0:
                labels[mask] = ATTACK_LABELS[attack_type]
                print(f"  ✓ {attack_type:15s}: {count:5d} samples "
                      f"({start_time.strftime('%H:%M:%S')} - {end_time.strftime('%H:%M:%S')})")
        
        # Add labels to dataframe
        self.sensor_df['attack_label'] = labels
        
        # Print label distribution
        print(f"\n{'='*70}")
        print("LABEL DISTRIBUTION")
        print(f"{'='*70}")
        
        label_counts = self.sensor_df['attack_label'].value_counts().sort_index()
        total = len(self.sensor_df)
        
        for label_code, count in label_counts.items():
            label_name = [k for k, v in ATTACK_LABELS.items() if v == label_code][0]
            pct = count / total * 100
            print(f"  {label_code} ({label_name:15s}): {count:7,} samples ({pct:5.2f}%)")
        
        return self.sensor_df
    
    def build_features(self):
        """Add derived features for ML training."""
        print(f"\n{'='*70}")
        print("FEATURE ENGINEERING")
        print(f"{'='*70}")
        
        # Add derived features
        self.sensor_df = add_derived_features(self.sensor_df)
        
        print(f"  ✓ Total features: {len(self.sensor_df.columns) - 1}")  # -1 for attack_label
        print(f"  ✓ Raw sensors: {len(FactoryLogParser().get_sensor_columns())}")
        print(f"  ✓ Derived features: {len(self.sensor_df.columns) - 1 - len(FactoryLogParser().get_sensor_columns())}")
        
        return self.sensor_df
    
    def create_splits(self, test_size=0.2, val_size=0.1, random_state=42):
        """
        Create train/val/test splits with stratification.
        
        Args:
            test_size: Fraction for test set
            val_size: Fraction of remaining for validation set
            random_state: Random seed for reproducibility
            
        Returns:
            tuple: (train_df, val_df, test_df)
        """
        print(f"\n{'='*70}")
        print("CREATING TRAIN/VAL/TEST SPLITS")
        print(f"{'='*70}")
        
        # First split: train+val vs test
        train_val_df, test_df = train_test_split(
            self.sensor_df,
            test_size=test_size,
            stratify=self.sensor_df['attack_label'],
            random_state=random_state
        )
        
        # Second split: train vs val
        val_size_adjusted = val_size / (1 - test_size)
        train_df, val_df = train_test_split(
            train_val_df,
            test_size=val_size_adjusted,
            stratify=train_val_df['attack_label'],
            random_state=random_state
        )
        
        print(f"  Train: {len(train_df):7,} samples ({len(train_df)/len(self.sensor_df)*100:5.1f}%)")
        print(f"  Val:   {len(val_df):7,} samples ({len(val_df)/len(self.sensor_df)*100:5.1f}%)")
        print(f"  Test:  {len(test_df):7,} samples ({len(test_df)/len(self.sensor_df)*100:5.1f}%)")
        
        return train_df, val_df, test_df
    
    def save_dataset(self, output_dir, train_df, val_df, test_df):
        """
        Save dataset splits and preprocessing info.
        
        Args:
            output_dir: Directory to save files
            train_df, val_df, test_df: DataFrames
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n{'='*70}")
        print(f"SAVING DATASET")
        print(f"{'='*70}")
        
        # Generate unique dataset name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save splits
        train_file = output_dir / f"train_{timestamp}.csv"
        val_file = output_dir / f"val_{timestamp}.csv"
        test_file = output_dir / f"test_{timestamp}.csv"
        
        train_df.to_csv(train_file)
        val_df.to_csv(val_file)
        test_df.to_csv(test_file)
        
        print(f"  ✓ Train: {train_file}")
        print(f"  ✓ Val:   {val_file}")
        print(f"  ✓ Test:  {test_file}")
        
        # Fit scaler on training data only
        feature_cols = [col for col in train_df.columns if col not in ['attack_label', 'timestamp']]
        
        scaler = StandardScaler()
        scaler.fit(train_df[feature_cols].values)
        
        # Save scaler
        scaler_file = output_dir / "scaler.pkl"
        with open(scaler_file, 'wb') as f:
            pickle.dump({
                'scaler': scaler,
                'feature_names': feature_cols
            }, f)
        print(f"  ✓ Scaler: {scaler_file}")
        
        # Save metadata
        metadata = {
            'timestamp': timestamp,
            'total_samples': len(self.sensor_df),
            'train_samples': len(train_df),
            'val_samples': len(val_df),
            'test_samples': len(test_df),
            'num_features': len(feature_cols),
            'feature_names': feature_cols,
            'attack_labels': ATTACK_LABELS,
            'factory_log': str(self.factory_log),
            'summary_file': str(self.summary_file)
        }
        
        metadata_file = output_dir / "metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"  ✓ Metadata: {metadata_file}")
        
        print(f"\n✓ Dataset saved to: {output_dir}")
        
        return output_dir


def main():
    """Build labeled ML dataset from logs."""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python dataset_builder.py <factory_log> <attack_summary>")
        print("\nExample:")
        print("  python dataset_builder.py \\")
        print("    collected_data/final_run/physics_logs/logs-Factory.log \\")
        print("    collected_data/final_run/attack_logs/attack-logs/collection_summary_20251120_163453.txt")
        sys.exit(1)
    
    factory_log = sys.argv[1]
    summary_file = sys.argv[2]
    output_dir = "datasets/nicssim_labeled"
    
    print(f"{'='*70}")
    print(f"NICSSIM DATASET BUILDER")
    print(f"{'='*70}")
    print(f"Factory log: {factory_log}")
    print(f"Attack summary: {summary_file}")
    print(f"Output directory: {output_dir}")
    
    # Build dataset
    builder = DatasetBuilder(factory_log, summary_file)
    builder.label_data()
    builder.build_features()
    train_df, val_df, test_df = builder.create_splits()
    dataset_dir = builder.save_dataset(output_dir, train_df, val_df, test_df)
    
    print(f"\n{'='*70}")
    print("✓ DATASET READY FOR ML TRAINING!")
    print(f"{'='*70}")
    print(f"\nNext steps:")
    print(f"  python train_detector.py {dataset_dir}")


if __name__ == "__main__":
    main()
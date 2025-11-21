#!/usr/bin/env python3
"""
log_parser.py

Parse NICSSIM Factory logs to extract sensor readings.
Factory logs contain JSON at the end of each line for easy parsing.
"""

import json
import re
from datetime import datetime
import pandas as pd


class FactoryLogParser:
    """Parser for Factory simulation logs with sensor data."""
    
    def __init__(self):
        # Regex to extract JSON from log line
        self.json_pattern = re.compile(r'\|\|\s*(\{.*\})\s*$')
        
    def parse_line(self, line):
        """
        Parse a single Factory log line.
        
        Example line:
        2025-11-20 15:30:52 [INFO] FACTORY: ts=2025-11-20T15:30:52.316 flux=0.744175 ... || {"ts":"2025-11-20T15:30:52.316","flux":0.744175,...}
        
        Returns:
            dict: Sensor readings, or None if parse fails
        """
        # Extract JSON part (after ||)
        match = self.json_pattern.search(line)
        if not match:
            return None
        
        try:
            data = json.loads(match.group(1))
            
            # Convert timestamp string to datetime
            if 'ts' in data:
                data['timestamp'] = pd.to_datetime(data['ts'])
                del data['ts']
            
            return data
            
        except json.JSONDecodeError:
            return None
    
    def parse_file(self, log_file_path, limit=None):
        """
        Parse entire Factory log file.
        
        Args:
            log_file_path: Path to logs-Factory.log
            limit: Optional limit on number of lines to parse
            
        Returns:
            pd.DataFrame: Sensor readings with timestamp index
        """
        records = []
        
        with open(log_file_path, 'r') as f:
            for i, line in enumerate(f):
                if limit and i >= limit:
                    break
                
                data = self.parse_line(line)
                if data:
                    records.append(data)
        
        if not records:
            raise ValueError(f"No valid sensor data found in {log_file_path}")
        
        df = pd.DataFrame(records)
        df.set_index('timestamp', inplace=True)
        df.sort_index(inplace=True)
        
        return df
    
    def get_sensor_columns(self):
        """Return list of expected sensor columns."""
        return [
            'flux',           # Neutron flux
            'temp_in',        # Core inlet temperature
            'temp_out',       # Core outlet temperature  
            'pressure',       # Core pressure
            'flow',           # Core flow
            'sg_in_p',        # Steam generator inlet pressure
            'rad',            # Radiation level
            'sg_sec_t_in',    # SG secondary inlet temp
            'sg_sec_t_out',   # SG secondary outlet temp
            'sg_p',           # SG pressure
            'sg_level',       # SG water level
            'sg_fw_flow',     # SG feedwater flow
            'sg_leak'         # SG leak rate
        ]


def add_derived_features(df):
    """
    Add derived features for ML training.
    
    Args:
        df: DataFrame with raw sensor readings
        
    Returns:
        pd.DataFrame: DataFrame with additional features
    """
    df = df.copy()
    
    # Temperature differential
    df['temp_diff'] = df['temp_out'] - df['temp_in']
    
    # Pressure differential  
    df['pressure_diff'] = df['pressure'] - df['sg_in_p']
    
    # SG temperature differential
    df['sg_temp_diff'] = df['sg_sec_t_out'] - df['sg_sec_t_in']
    
    # Rolling statistics (window = 10 samples, ~10 seconds at 1Hz)
    window = 10
    
    for col in ['flux', 'temp_out', 'pressure', 'sg_level', 'flow']:
        # Rolling mean
        df[f'{col}_mean'] = df[col].rolling(window=window, min_periods=1).mean()
        
        # Rolling std (variance indicator)
        df[f'{col}_std'] = df[col].rolling(window=window, min_periods=1).std().fillna(0)
        
        # Rolling max-min (range indicator)
        df[f'{col}_range'] = (df[col].rolling(window=window, min_periods=1).max() - 
                               df[col].rolling(window=window, min_periods=1).min())
    
    return df


def main():
    """Example usage: Parse a Factory log file."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python log_parser.py <path_to_logs-Factory.log>")
        sys.exit(1)
    
    log_file = sys.argv[1]
    
    print(f"Parsing {log_file}...")
    parser = FactoryLogParser()
    
    # Parse log file
    df = parser.parse_file(log_file)
    
    print(f"\n✓ Parsed {len(df):,} sensor readings")
    print(f"  Time range: {df.index[0]} to {df.index[-1]}")
    print(f"  Duration: {(df.index[-1] - df.index[0]).total_seconds() / 3600:.2f} hours")
    
    # Show sample
    print("\nSample sensor readings:")
    print(df.head())
    
    # Add derived features
    df_features = add_derived_features(df)
    print(f"\n✓ Added derived features: {len(df_features.columns)} total columns")
    
    # Save to CSV
    output_file = log_file.replace('.log', '_parsed.csv')
    df_features.to_csv(output_file)
    print(f"\n✓ Saved to: {output_file}")


if __name__ == "__main__":
    main()
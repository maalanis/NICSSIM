import pandas as pd
import re
from datetime import datetime

# Parse the log file manually
def parse_hmi1_log(filepath):
    pattern = re.compile(
        r'(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) '
        r'\[INFO\] HMI1: '
        r'P1 flux=(?P<flux>[\d.]+) '
        r'sp=(?P<flux_sp>[\d.]+) '
        r'Tin=(?P<temp_in>[\d.]+) '
        r'Tout=(?P<temp_out>[\d.]+) '
        r'Pcore=(?P<pressure_core>[\d.]+) '
        r'Flow=(?P<flow>[\d.]+) '
        r'\| P2 PsgIn=(?P<pressure_sg_in>[\d.]+) '
        r'Rad=(?P<radiation>[\d.]+) '
        r'LoopPos=(?P<loop_valve_pos>[\d.]+) '
        r'\| P3 SG_Tin=(?P<sg_temp_in>[\d.]+) '
        r'SG_Tout=(?P<sg_temp_out>[\d.]+) '
        r'SG_P=(?P<sg_pressure>[\d.]+) '
        r'SG_Lvl=(?P<sg_level>[\d.]+) '
        r'FW_Flow=(?P<fw_flow>[\d.]+) '
    )
    
    data = []
    with open(filepath, 'r') as f:
        for line in f:
            match = pattern.search(line)
            if match:
                row = match.groupdict()
                row['timestamp'] = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
                for k in row:
                    if k != 'timestamp':
                        row[k] = float(row[k])
                data.append(row)
    
    df = pd.DataFrame(data)
    df.set_index('timestamp', inplace=True)
    
    # Add derived features
    df['temp_diff'] = df['temp_out'] - df['temp_in']
    df['pressure_diff'] = df['pressure_core'] - df['pressure_sg_in']
    df['flux_error'] = df['flux'] - df['flux_sp']
    
    return df

# Parse and save
log_file = 'src/logs/baseline_hmi1_20251115_193836.log'
print(f"Parsing {log_file}...")

df = parse_hmi1_log(log_file)
print(f"✓ Parsed {len(df):,} samples")

# Clean
df_clean = df[
    (df['temp_out'] > 280) &
    (df['pressure_core'] > 14) &
    (df['flux'] > 0.5)
]
print(f"✓ After cleaning: {len(df_clean):,} samples")

# Save
df_clean.to_csv('src/logs/baseline_production.csv')
print(f"✓ Saved to src/logs/baseline_production.csv")
print(f"\nStats:")
print(df_clean[['flux', 'temp_out', 'pressure_core', 'sg_level']].describe())

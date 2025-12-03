from src.defender.log_parser import HMI1LogParser
import pandas as pd

parser = HMI1LogParser()
df = parser.parse_file('src/logs/logs-HMI1.log')
df_enhanced = parser.add_derived_features(df)
df_clean = df_enhanced[
    (df_enhanced['temp_out'] > 280) &
    (df_enhanced['pressure_core'] > 14) &
    (df_enhanced['flux'] > 0.5)
].copy()
df_clean.to_csv('src/logs/baseline_production.csv')
print(f'✓ Saved {len(df_clean):,} samples to src/logs/baseline_production.csv')

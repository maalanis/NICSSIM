import pandas as pd

# Load clean data
df_clean = pd.read_csv("src/logs/baseline_clean.csv", index_col=0, parse_dates=True)

# Remove any samples with zeros (startup/shutdown artifacts)
df_final = df_clean[
    (df_clean['temp_out'] > 280) &      # PWR inlet is 290K
    (df_clean['pressure_core'] > 14) &  # Normal pressure >14 bar
    (df_clean['flux'] > 0.5)            # Reactor is critical
].copy()

print(f"After removing startup artifacts: {len(df_final)} samples")
print(f"\nFinal baseline statistics:")
print(df_final[['temp_out', 'pressure_core', 'flux', 'sg_level']].describe())

# This is your production baseline
df_final.to_csv("src/logs/baseline_production.csv")
print(f"\n✅ Saved production baseline: {len(df_final)} samples")
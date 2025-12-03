#!/usr/bin/env python3
"""
Convert clean CSV back to log format for testing.
"""

import pandas as pd

def csv_to_log(csv_path, output_log_path):
    """Convert clean CSV back to HMI1 log format."""
    
    df = pd.read_csv(csv_path, index_col=0, parse_dates=True)
    
    with open(output_log_path, 'w') as f:
        for timestamp, row in df.iterrows():
            # Format timestamp
            ts_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
            
            # Reconstruct log line
            line = (
                f"{ts_str} [INFO] HMI1: "
                f"P1 flux={row['flux']:.3f} sp={row['flux_sp']:.3f} "
                f"Tin={row['temp_in']:.3f} Tout={row['temp_out']:.3f} "
                f"Pcore={row['pressure_core']:.3f} Flow={row['flow']:.3f} "
                f"| P2 PsgIn={row['pressure_sg_in']:.3f} Rad={row['radiation']:.3f} "
                f"LoopPos={row['loop_valve_pos']:.3f} "
                f"| P3 SG_Tin={row['sg_temp_in']:.3f} SG_Tout={row['sg_temp_out']:.3f} "
                f"SG_P={row['sg_pressure']:.3f} SG_Lvl={row['sg_level']:.3f} "
                f"FW_Flow={row['fw_flow']:.3f} FW_Cmd={row['fw_valve_cmd']:.3f} "
                f"FW_Mode={row['fw_mode']} SG_Relief={int(row['sg_relief'])} "
                f"| ALARM={int(row['alarm'])}\n"
            )
            f.write(line)
    
    print(f" Created clean log file: {output_log_path}")
    print(f"   {len(df)} samples written")

if __name__ == "__main__":
    csv_path = "src/logs/baseline_production.csv"
    output_path = "src/logs/baseline_production_clean.log"
    
    csv_to_log(csv_path, output_path)
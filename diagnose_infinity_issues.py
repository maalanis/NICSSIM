#!/usr/bin/env python3
"""
diagnose_infinity_issues.py

Diagnostic tool to identify and report infinity/NaN issues in NICSSIM datasets.
Use this to understand what went wrong in your dataset_builder run.

Usage:
    python diagnose_infinity_issues.py datasets/vv1_phase1/train_vv1_phase1.csv
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path


def diagnose_csv_file(filepath: str):
    """Comprehensive diagnosis of infinity issues in CSV file."""
    
    print("\n" + "="*70)
    print("INFINITY/NAN DIAGNOSTIC REPORT")
    print("="*70)
    print(f"File: {filepath}")
    
    # Load data
    try:
        df = pd.read_csv(filepath)
        print(f" Loaded {len(df)} samples, {len(df.columns)} columns")
    except Exception as e:
        print(f" Failed to load file: {e}")
        return
    
    # Get numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    print(f"✓ Found {len(numeric_cols)} numeric columns\n")
    
    # ========================================================================
    # INFINITY ANALYSIS
    # ========================================================================
    print("-" * 70)
    print("INFINITY VALUE ANALYSIS")
    print("-" * 70)
    
    inf_issues = []
    total_inf = 0
    
    for col in numeric_cols:
        n_pos_inf = np.isposinf(df[col]).sum()
        n_neg_inf = np.isneginf(df[col]).sum()
        n_total_inf = n_pos_inf + n_neg_inf
        
        if n_total_inf > 0:
            inf_issues.append({
                'column': col,
                'pos_inf': n_pos_inf,
                'neg_inf': n_neg_inf,
                'total': n_total_inf,
                'pct': n_total_inf / len(df) * 100
            })
            total_inf += n_total_inf
    
    if inf_issues:
        print(f"\n⚠ Found {total_inf:,} total infinity values in {len(inf_issues)} columns:\n")
        
        # Sort by count
        inf_issues.sort(key=lambda x: x['total'], reverse=True)
        
        print(f"{'Column':<40} {'Pos Inf':>10} {'Neg Inf':>10} {'Total':>10} {'%':>8}")
        print("-" * 80)
        
        for issue in inf_issues[:20]:  # Top 20
            print(f"{issue['column']:<40} {issue['pos_inf']:>10,} {issue['neg_inf']:>10,} "
                  f"{issue['total']:>10,} {issue['pct']:>7.2f}%")
        
        if len(inf_issues) > 20:
            print(f"\n... and {len(inf_issues) - 20} more columns with inf values")
        
        # Identify likely culprits based on column names
        print("\n" + "-" * 70)
        print("LIKELY ROOT CAUSES (based on column names):")
        print("-" * 70)
        
        ratio_cols = [c for c in inf_issues if 'ratio' in c['column'].lower()]
        corr_cols = [c for c in inf_issues if 'corr' in c['column'].lower()]
        fft_cols = [c for c in inf_issues if 'fft' in c['column'].lower() or 'entropy' in c['column'].lower()]
        other_cols = [c for c in inf_issues if c not in ratio_cols + corr_cols + fft_cols]
        
        if ratio_cols:
            print(f"\n1. RATIO FEATURES ({len(ratio_cols)} columns):")
            print("   Issue: Division by zero or very small numbers")
            for col in ratio_cols[:5]:
                print(f"   - {col['column']}: {col['total']:,} inf values")
        
        if corr_cols:
            print(f"\n2. CORRELATION FEATURES ({len(corr_cols)} columns):")
            print("   Issue: Rolling correlation with constant or near-zero variance")
            for col in corr_cols[:5]:
                print(f"   - {col['column']}: {col['total']:,} inf values")
        
        if fft_cols:
            print(f"\n3. FFT/SPECTRAL FEATURES ({len(fft_cols)} columns):")
            print("   Issue: Power spectral density normalization issues")
            for col in fft_cols[:5]:
                print(f"   - {col['column']}: {col['total']:,} inf values")
        
        if other_cols:
            print(f"\n4. OTHER FEATURES ({len(other_cols)} columns):")
            for col in other_cols[:5]:
                print(f"   - {col['column']}: {col['total']:,} inf values")
    else:
        print("✓ No infinity values found")
    
    # ========================================================================
    # NAN ANALYSIS
    # ========================================================================
    print("\n" + "-" * 70)
    print("NaN VALUE ANALYSIS")
    print("-" * 70)
    
    nan_issues = []
    total_nan = 0
    
    for col in df.columns:
        n_nan = df[col].isna().sum()
        if n_nan > 0:
            nan_issues.append({
                'column': col,
                'count': n_nan,
                'pct': n_nan / len(df) * 100
            })
            total_nan += n_nan
    
    if nan_issues:
        print(f"\n⚠ Found {total_nan:,} total NaN values in {len(nan_issues)} columns:\n")
        
        nan_issues.sort(key=lambda x: x['count'], reverse=True)
        
        print(f"{'Column':<40} {'Count':>10} {'%':>8}")
        print("-" * 60)
        
        for issue in nan_issues[:20]:
            print(f"{issue['column']:<40} {issue['count']:>10,} {issue['pct']:>7.2f}%")
        
        if len(nan_issues) > 20:
            print(f"\n... and {len(nan_issues) - 20} more columns with NaN values")
    else:
        print("✓ No NaN values found")
    
    # ========================================================================
    # EXTREME VALUE ANALYSIS
    # ========================================================================
    print("\n" + "-" * 70)
    print("EXTREME VALUE ANALYSIS (>1e10 or <-1e10)")
    print("-" * 70)
    
    extreme_issues = []
    
    for col in numeric_cols:
        max_val = df[col].abs().max()
        if max_val > 1e10:
            extreme_issues.append({
                'column': col,
                'max_abs': max_val,
                'min_val': df[col].min(),
                'max_val': df[col].max()
            })
    
    if extreme_issues:
        print(f"\n⚠ Found {len(extreme_issues)} columns with extreme values:\n")
        
        extreme_issues.sort(key=lambda x: x['max_abs'], reverse=True)
        
        print(f"{'Column':<40} {'Max Abs Value':>20}")
        print("-" * 62)
        
        for issue in extreme_issues[:20]:
            print(f"{issue['column']:<40} {issue['max_abs']:>20.2e}")
    else:
        print("✓ No extreme values found")
    
    # ========================================================================
    # ZERO VARIANCE ANALYSIS
    # ========================================================================
    print("\n" + "-" * 70)
    print("ZERO VARIANCE ANALYSIS (constant columns)")
    print("-" * 70)
    
    zero_var_cols = []
    
    for col in numeric_cols:
        if df[col].nunique() == 1:
            zero_var_cols.append({
                'column': col,
                'value': df[col].iloc[0]
            })
    
    if zero_var_cols:
        print(f"\n⚠ Found {len(zero_var_cols)} constant columns:\n")
        for col in zero_var_cols[:20]:
            print(f"  {col['column']:<40} = {col['value']}")
    else:
        print("✓ No zero-variance columns found")
    
    # ========================================================================
    # RECOMMENDATIONS
    # ========================================================================
    print("\n" + "="*70)
    print("RECOMMENDATIONS")
    print("="*70)
    
    if inf_issues or nan_issues or extreme_issues:
        print("\n⚠ Data quality issues detected. Recommended actions:\n")
        
        print("1. Use the FIXED dataset_builder.py:")
        print("   python dataset_builder_fixed.py --log-dir src/logs --version v1_phase1_fixed\n")
        
        print("2. The fixed version includes:")
        print("   ✓ Robust ratio calculation with bounds")
        print("   ✓ Safe FFT/spectral entropy computation")
        print("   ✓ Comprehensive inf/NaN cleaning")
        print("   ✓ Data quality validation at each stage\n")
        
        if ratio_cols:
            print("3. Ratio features: Now clipped to [-1000, 1000] range")
        
        if fft_cols:
            print("4. FFT features: Now includes zero-check before division")
        
        print("\n5. Run validation before training:")
        print("   python data_validator.py datasets/vv1_phase1_fixed/train_vv1_phase1_fixed.csv")
    else:
        print("\n✓ Dataset appears clean! Ready for training.")
    
    print("\n" + "="*70 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python diagnose_infinity_issues.py <csv_file>")
        print("\nExample:")
        print("  python diagnose_infinity_issues.py datasets/vv1_phase1/train_vv1_phase1.csv")
        print("\nOr diagnose all splits:")
        print("  python diagnose_infinity_issues.py datasets/vv1_phase1/train_*.csv")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if '*' in filepath:
        # Handle wildcards
        from glob import glob
        files = glob(filepath)
        if not files:
            print(f"No files found matching: {filepath}")
            sys.exit(1)
        
        for f in files:
            diagnose_csv_file(f)
    else:
        if not Path(filepath).exists():
            print(f"File not found: {filepath}")
            sys.exit(1)
        
        diagnose_csv_file(filepath)


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
data_validator.py

Comprehensive data quality validation for NICSSIM datasets.
Detects and reports infinity, NaN, and extreme value issues.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import logging


class DataQualityValidator:
    """Validates data quality for ML training datasets."""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger(__name__)
        self.issues = []
        
    def validate_dataframe(self, df: pd.DataFrame, 
                          stage: str = "unknown") -> Dict[str, any]:
        """
        Comprehensive validation of DataFrame.
        
        Args:
            df: DataFrame to validate
            stage: Pipeline stage name for logging
            
        Returns:
            Dict with validation results
        """
        results = {
            'stage': stage,
            'total_samples': len(df),
            'total_features': len(df.columns),
            'issues': []
        }
        
        # Check for infinity values
        inf_report = self._check_infinity(df)
        if inf_report['has_inf']:
            results['issues'].append(inf_report)
            self.logger.warning(f"[{stage}] Found {inf_report['total_inf']} infinity values")
        
        # Check for NaN values
        nan_report = self._check_nan(df)
        if nan_report['has_nan']:
            results['issues'].append(nan_report)
            self.logger.warning(f"[{stage}] Found {nan_report['total_nan']} NaN values")
        
        # Check for extreme values
        extreme_report = self._check_extreme_values(df)
        if extreme_report['has_extreme']:
            results['issues'].append(extreme_report)
            self.logger.warning(f"[{stage}] Found {extreme_report['n_extreme_cols']} columns with extreme values")
        
        # Check for zero variance columns
        zero_var_report = self._check_zero_variance(df)
        if zero_var_report['has_zero_var']:
            results['issues'].append(zero_var_report)
            self.logger.warning(f"[{stage}] Found {len(zero_var_report['zero_var_cols'])} zero-variance columns")
        
        if not results['issues']:
            self.logger.info(f"[{stage}] ✓ Data quality check passed")
        
        return results
    
    def _check_infinity(self, df: pd.DataFrame) -> Dict:
        """Check for infinity values."""
        inf_cols = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            n_inf = np.isinf(df[col]).sum()
            if n_inf > 0:
                inf_cols.append({
                    'column': col,
                    'count': int(n_inf),
                    'pct': float(n_inf / len(df) * 100)
                })
        
        return {
            'type': 'infinity',
            'has_inf': len(inf_cols) > 0,
            'total_inf': sum(c['count'] for c in inf_cols),
            'affected_columns': inf_cols
        }
    
    def _check_nan(self, df: pd.DataFrame) -> Dict:
        """Check for NaN values."""
        nan_cols = []
        
        for col in df.columns:
            n_nan = df[col].isna().sum()
            if n_nan > 0:
                nan_cols.append({
                    'column': col,
                    'count': int(n_nan),
                    'pct': float(n_nan / len(df) * 100)
                })
        
        return {
            'type': 'nan',
            'has_nan': len(nan_cols) > 0,
            'total_nan': sum(c['count'] for c in nan_cols),
            'affected_columns': nan_cols
        }
    
    def _check_extreme_values(self, df: pd.DataFrame, 
                             threshold: float = 1e10) -> Dict:
        """Check for extremely large values that might overflow."""
        extreme_cols = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            max_val = df[col].abs().max()
            if max_val > threshold:
                extreme_cols.append({
                    'column': col,
                    'max_abs_value': float(max_val),
                    'exceeds_threshold': float(threshold)
                })
        
        return {
            'type': 'extreme_values',
            'has_extreme': len(extreme_cols) > 0,
            'n_extreme_cols': len(extreme_cols),
            'threshold': threshold,
            'affected_columns': extreme_cols
        }
    
    def _check_zero_variance(self, df: pd.DataFrame) -> Dict:
        """Check for zero variance columns (constant values)."""
        zero_var_cols = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].nunique() == 1:
                zero_var_cols.append({
                    'column': col,
                    'constant_value': float(df[col].iloc[0])
                })
        
        return {
            'type': 'zero_variance',
            'has_zero_var': len(zero_var_cols) > 0,
            'zero_var_cols': zero_var_cols
        }
    
    def print_report(self, results: Dict):
        """Print human-readable validation report."""
        print("\n" + "="*70)
        print(f"DATA QUALITY REPORT - {results['stage']}")
        print("="*70)
        print(f"Total samples: {results['total_samples']:,}")
        print(f"Total features: {results['total_features']}")
        
        if not results['issues']:
            print("\n✓ No data quality issues detected")
        else:
            print(f"\n⚠ Found {len(results['issues'])} issue types:\n")
            
            for issue in results['issues']:
                if issue['type'] == 'infinity':
                    print(f"INFINITY VALUES:")
                    print(f"  Total: {issue['total_inf']:,}")
                    print(f"  Affected columns ({len(issue['affected_columns'])}):")
                    for col in sorted(issue['affected_columns'], 
                                     key=lambda x: x['count'], reverse=True)[:10]:
                        print(f"    {col['column']:30s}: {col['count']:7,} ({col['pct']:5.1f}%)")
                
                elif issue['type'] == 'nan':
                    print(f"\nNaN VALUES:")
                    print(f"  Total: {issue['total_nan']:,}")
                    print(f"  Affected columns ({len(issue['affected_columns'])}):")
                    for col in sorted(issue['affected_columns'],
                                     key=lambda x: x['count'], reverse=True)[:10]:
                        print(f"    {col['column']:30s}: {col['count']:7,} ({col['pct']:5.1f}%)")
                
                elif issue['type'] == 'extreme_values':
                    print(f"\nEXTREME VALUES (threshold: {issue['threshold']:.0e}):")
                    for col in issue['affected_columns'][:10]:
                        print(f"    {col['column']:30s}: max = {col['max_abs_value']:.2e}")
                
                elif issue['type'] == 'zero_variance':
                    print(f"\nZERO VARIANCE COLUMNS:")
                    for col in issue['zero_var_cols'][:10]:
                        print(f"    {col['column']:30s}: constant = {col['constant_value']}")
        
        print("="*70 + "\n")


def validate_csv_file(filepath: str) -> Dict:
    """Quick validation of a CSV file."""
    print(f"Validating {filepath}...")
    df = pd.read_csv(filepath)
    
    validator = DataQualityValidator()
    results = validator.validate_dataframe(df, stage=filepath)
    validator.print_report(results)
    
    return results


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Validate specified file
        validate_csv_file(sys.argv[1])
    else:
        print("Usage: python data_validator.py <csv_file>")
        print("\nExample:")
        print("  python data_validator.py datasets/vv1_phase1/train_vv1_phase1.csv")
#!/usr/bin/env python3
"""
dataset_builder.py - FIXED VERSION

Comprehensive dataset builder for NICSSIM cyber-attack ML training.
NOW WITH ROBUST INF/NAN HANDLING AND DATA VALIDATION.

Key improvements:
- Prevents infinity values in feature engineering
- Handles NaN values intelligently
- Adds data quality validation at each stage
- Clips extreme values using percentile-based approach
- Logs data quality issues for research transparency
"""

import os
import re
import json
import logging
import argparse
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import warnings
import pickle

# Import the existing parser
from src.defender.log_parser import HMI1LogParser

# Import data validator
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from data_validator import DataQualityValidator
except ImportError:
    print("⚠ Warning: data_validator.py not found. Data validation will be skipped.")
    DataQualityValidator = None

warnings.filterwarnings('ignore')

# ============================================================================
# ATTACK TAXONOMY
# ============================================================================
ATTACK_TYPES = {
    'baseline': 0,
    'sensor-spike': 1,
    'sensor-freeze': 2,
    'ddos': 3,
    'command-injection': 4,
    'mitm': 5,
    'replay': 6,
    'scan': 7,
}

ATTACK_LABELS = {v: k for k, v in ATTACK_TYPES.items()}


# ============================================================================
# ENHANCED DATASET BUILDER CLASS
# ============================================================================
class DatasetBuilder:
    """
    Builds comprehensive labeled datasets from NICSSIM logs.
    NOW WITH ROBUST DATA QUALITY HANDLING.
    """
    
    def __init__(self, 
                 log_root_dir: str = "src/logs",
                 output_dir: str = "datasets",
                 version: str = None,
                 enable_validation: bool = True):
        """
        Initialize the dataset builder.
        
        Args:
            log_root_dir: Root directory containing log files
            output_dir: Directory to save processed datasets
            version: Dataset version string (auto-generated if None)
            enable_validation: Enable data quality validation
        """
        self.log_root_dir = Path(log_root_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Version control
        self.version = version or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.version_dir = self.output_dir / f"v{self.version}"
        self.version_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize parser
        self.parser = HMI1LogParser()
        
        # Data quality validator
        self.enable_validation = enable_validation
        self.validator = DataQualityValidator() if DataQualityValidator else None
        
        # Setup logging
        self.logger = self._setup_logger()
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'total_samples': 0,
            'attack_distribution': {},
            'processing_errors': [],
            'data_quality_issues': [],
        }
        
    def _setup_logger(self) -> logging.Logger:
        """Setup dedicated logger for dataset building."""
        logger = logging.getLogger('DatasetBuilder')
        logger.setLevel(logging.INFO)
        
        # Remove existing handlers to avoid duplicates
        logger.handlers = []
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        # File handler
        log_file = self.version_dir / 'build_log.txt'
        fh = logging.FileHandler(log_file)
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(formatter)
        logger.addHandler(fh)
        
        return logger
    
    # ========================================================================
    # FILE DISCOVERY & ORGANIZATION
    # ========================================================================
    
    def discover_log_files(self, pattern: str = "*.log") -> Dict[str, List[Path]]:
        """
        Discover all log files organized by attack type.
        
        Expected directory structure:
            logs/
                baseline/
                    baseline_3hr_20251110_183009_HMI1.log
                sensor-spike/
                    attack_20251110_140523_HMI1.log
                ...
        """
        discovered = {}
        
        # Search for logs in organized subdirectories
        for attack_type in ATTACK_TYPES.keys():
            attack_dir = self.log_root_dir / attack_type
            if attack_dir.exists():
                files = sorted(attack_dir.glob(pattern))
                if files:
                    discovered[attack_type] = files
                    self.logger.info(f"Found {len(files)} files for '{attack_type}'")
        
        # Also search flat structure with naming convention
        flat_files = list(self.log_root_dir.glob(pattern))
        for file in flat_files:
            for attack_type in ATTACK_TYPES.keys():
                if attack_type.replace('-', '_') in file.name.lower():
                    if attack_type not in discovered:
                        discovered[attack_type] = []
                    discovered[attack_type].append(file)
        
        total_files = sum(len(files) for files in discovered.values())
        self.logger.info(f"Discovered {total_files} total log files across {len(discovered)} attack types")
        
        return discovered
    
    def parse_single_file(self, 
                         filepath: Path, 
                         attack_type: str) -> Optional[pd.DataFrame]:
        """Parse a single log file and add attack label."""
        try:
            self.logger.debug(f"Parsing {filepath.name}...")
            
            df = self.parser.parse_file(str(filepath))
            
            # Add metadata columns
            df['attack_type'] = attack_type
            df['attack_label'] = ATTACK_TYPES[attack_type]
            df['source_file'] = filepath.name
            df['session_id'] = self._extract_session_id(filepath.name)
            
            self.logger.debug(f"✓ Parsed {len(df)} samples from {filepath.name}")
            return df
            
        except Exception as e:
            self.logger.error(f"Failed to parse {filepath.name}: {e}")
            self.stats['processing_errors'].append({
                'file': str(filepath),
                'error': str(e)
            })
            return None
    
    def _extract_session_id(self, filename: str) -> str:
        """Extract session ID from filename timestamp."""
        match = re.search(r'(\d{8}_\d{6})', filename)
        if match:
            return match.group(1)
        return Path(filename).stem
    
    # ========================================================================
    # ROBUST FEATURE ENGINEERING (INF/NAN SAFE)
    # ========================================================================
    
    def add_advanced_features(self, df: pd.DataFrame, 
                             window_sizes: List[int] = [5, 10, 20]) -> pd.DataFrame:
        """
        Add advanced features with ROBUST inf/NaN handling.
        
        Features added:
        1. Basic derived features (from log_parser.py)
        2. Multi-window rolling statistics
        3. Cross-correlation features (inf-safe)
        4. Frequency domain features (FFT)
        5. Lag features for temporal dependencies
        """
        df = df.copy()
        
        self.logger.info("Adding advanced features with data quality protection...")
        
        # Validate input data
        if self.enable_validation and self.validator:
            input_report = self.validator.validate_dataframe(df, "before_feature_engineering")
            if input_report['issues']:
                self.logger.warning("Input data has quality issues - cleaning before feature engineering")
                df = self._clean_dataframe(df)
        
        # 1. Basic derived features
        df = self.parser.add_derived_features(df, window_size=10)
        
        # 2. Multi-window rolling statistics
        critical_sensors = [
            'flux', 'temp_out', 'pressure_core', 'flow', 
            'sg_level', 'sg_pressure', 'radiation'
        ]
        
        for sensor in critical_sensors:
            if sensor not in df.columns:
                continue
                
            for window in window_sizes:
                # Rolling mean
                df[f'{sensor}_mean_{window}'] = df[sensor].rolling(
                    window=window, min_periods=1
                ).mean()
                
                # Rolling std
                df[f'{sensor}_std_{window}'] = df[sensor].rolling(
                    window=window, min_periods=1
                ).std()
                
                # Rolling min/max
                df[f'{sensor}_min_{window}'] = df[sensor].rolling(
                    window=window, min_periods=1
                ).min()
                
                df[f'{sensor}_max_{window}'] = df[sensor].rolling(
                    window=window, min_periods=1
                ).max()
        
        # 3. Cross-correlation features (FIXED - inf-safe)
        df = self._add_cross_correlation_features_safe(df, critical_sensors)
        
        # 4. Frequency domain features (FIXED - robust FFT)
        df = self._add_fft_features_safe(df, critical_sensors, window_size=50)
        
        # 5. Lag features
        df = self._add_lag_features(df, critical_sensors, lags=[1, 5, 10])
        
        # 6. Rate acceleration
        for sensor in critical_sensors:
            if f'{sensor}_rate' in df.columns:
                df[f'{sensor}_accel'] = df[f'{sensor}_rate'].diff()
        
        # 7. CRITICAL: Clean inf/NaN values after all feature engineering
        df = self._clean_dataframe(df)
        
        # Validate output data
        if self.enable_validation and self.validator:
            output_report = self.validator.validate_dataframe(df, "after_feature_engineering")
            if output_report['issues']:
                self.stats['data_quality_issues'].append(output_report)
                self.logger.error("Feature engineering produced data quality issues!")
                # Try one more aggressive cleaning
                df = self._clean_dataframe(df, aggressive=True)
        
        self.logger.info(f"✓ Feature engineering complete: {len(df.columns)} total features")
        
        return df
    
    def _clean_dataframe(self, df: pd.DataFrame, aggressive: bool = False) -> pd.DataFrame:
        """
        Robust cleaning of inf/NaN values.
        
        Strategy:
        1. Replace inf with NaN
        2. Fill NaN with forward-fill, then back-fill
        3. Remaining NaN to 0
        4. (Aggressive) Clip extreme values using percentiles
        """
        df = df.copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        # Count issues before cleaning
        n_inf = np.isinf(df[numeric_cols].values).sum()
        n_nan = df[numeric_cols].isna().sum().sum()
        
        if n_inf > 0 or n_nan > 0:
            self.logger.info(f"Cleaning: {n_inf} inf, {n_nan} NaN values")
        
        # 1. Replace inf with NaN
        df[numeric_cols] = df[numeric_cols].replace([np.inf, -np.inf], np.nan)
        
        # 2. Fill NaN values
        # Forward fill (use last valid observation)
        df[numeric_cols] = df[numeric_cols].fillna(method='ffill')
        # Backward fill (for leading NaNs)
        df[numeric_cols] = df[numeric_cols].fillna(method='bfill')
        # Remaining NaNs to 0
        df[numeric_cols] = df[numeric_cols].fillna(0)
        
        # 3. Aggressive mode: clip extreme values
        if aggressive:
            self.logger.info("Applying aggressive outlier clipping...")
            for col in numeric_cols:
                # Use 0.1% and 99.9% percentiles as bounds
                lower = df[col].quantile(0.001)
                upper = df[col].quantile(0.999)
                
                # Only clip if bounds are reasonable
                if np.isfinite(lower) and np.isfinite(upper):
                    df[col] = df[col].clip(lower=lower, upper=upper)
        
        # 4. Final safety check - replace any remaining inf/NaN
        df[numeric_cols] = df[numeric_cols].replace([np.inf, -np.inf], 0)
        df[numeric_cols] = df[numeric_cols].fillna(0)
        
        return df
    
    def _add_cross_correlation_features_safe(self, 
                                            df: pd.DataFrame, 
                                            sensors: List[str],
                                            window: int = 10) -> pd.DataFrame:
        """
        Add cross-correlation features (INF-SAFE VERSION).
        """
        sensor_pairs = [
            ('flux', 'temp_out'),
            ('temp_out', 'pressure_core'),
            ('pressure_core', 'flow'),
            ('sg_pressure', 'sg_level'),
            ('flow', 'fw_flow'),
        ]
        
        for s1, s2 in sensor_pairs:
            if s1 in df.columns and s2 in df.columns:
                # Rolling correlation (handles inf gracefully)
                df[f'corr_{s1}_{s2}'] = df[s1].rolling(
                    window=window, min_periods=1
                ).corr(df[s2])
                
                # FIXED: Ratio with proper bounds
                # Use larger epsilon and clip result
                s2_safe = df[s2].copy()
                s2_safe[s2_safe == 0] = 1e-6  # Replace exact zeros
                
                ratio = df[s1] / s2_safe
                # Clip to reasonable range [-1000, 1000]
                ratio = ratio.clip(-1000, 1000)
                df[f'ratio_{s1}_{s2}'] = ratio
        
        return df
    
    def _add_fft_features_safe(self, 
                              df: pd.DataFrame, 
                              sensors: List[str],
                              window_size: int = 50) -> pd.DataFrame:
        """
        Add frequency domain features (ROBUST VERSION).
        """
        for sensor in sensors:
            if sensor not in df.columns:
                continue
            
            # FIXED: Robust dominant frequency calculation
            def dominant_freq_safe(x):
                try:
                    if len(x) < 10 or np.isnan(x).all():
                        return 0.0
                    
                    # Remove NaN/inf before FFT
                    x_clean = x[np.isfinite(x)]
                    if len(x_clean) < 10:
                        return 0.0
                    
                    fft = np.fft.fft(x_clean)
                    freqs = np.fft.fftfreq(len(x_clean))
                    
                    pos_mask = freqs > 0
                    magnitudes = np.abs(fft[pos_mask])
                    
                    if len(magnitudes) == 0:
                        return 0.0
                    
                    return float(freqs[pos_mask][np.argmax(magnitudes)])
                except:
                    return 0.0
            
            df[f'{sensor}_fft_dom_freq'] = df[sensor].rolling(
                window=window_size, min_periods=10
            ).apply(dominant_freq_safe, raw=True)
            
            # FIXED: Robust spectral entropy
            def spectral_entropy_safe(x):
                try:
                    if len(x) < 10 or np.isnan(x).all():
                        return 0.0
                    
                    x_clean = x[np.isfinite(x)]
                    if len(x_clean) < 10:
                        return 0.0
                    
                    fft = np.fft.fft(x_clean)
                    psd = np.abs(fft) ** 2
                    
                    # Avoid division by zero
                    psd_sum = psd.sum()
                    if psd_sum == 0 or not np.isfinite(psd_sum):
                        return 0.0
                    
                    psd_norm = psd / psd_sum
                    psd_norm = psd_norm[psd_norm > 1e-10]  # Avoid log(0)
                    
                    if len(psd_norm) == 0:
                        return 0.0
                    
                    entropy = -np.sum(psd_norm * np.log2(psd_norm + 1e-10))
                    
                    # Clip to reasonable range
                    return float(np.clip(entropy, 0, 20))
                except:
                    return 0.0
            
            df[f'{sensor}_spectral_entropy'] = df[sensor].rolling(
                window=window_size, min_periods=10
            ).apply(spectral_entropy_safe, raw=True)
        
        return df
    
    def _add_lag_features(self, 
                         df: pd.DataFrame, 
                         sensors: List[str],
                         lags: List[int]) -> pd.DataFrame:
        """Add lagged sensor values."""
        for sensor in sensors:
            if sensor not in df.columns:
                continue
            for lag in lags:
                df[f'{sensor}_lag_{lag}'] = df[sensor].shift(lag)
        
        return df
    
    # ========================================================================
    # DATASET ASSEMBLY & SPLITTING
    # ========================================================================
    
    def build_unified_dataset(self, 
                             file_map: Dict[str, List[Path]],
                             add_features: bool = True,
                             balance_classes: bool = False) -> pd.DataFrame:
        """Build unified dataset from all log files."""
        all_dfs = []
        
        for attack_type, files in file_map.items():
            self.logger.info(f"Processing {len(files)} files for '{attack_type}'...")
            
            attack_dfs = []
            for filepath in files:
                df = self.parse_single_file(filepath, attack_type)
                if df is not None:
                    attack_dfs.append(df)
                    self.stats['files_processed'] += 1
            
            if attack_dfs:
                attack_df = pd.concat(attack_dfs, ignore_index=True)
                attack_df.sort_index(inplace=True)
                
                # Add advanced features if requested
                if add_features:
                    attack_df = self.add_advanced_features(attack_df)
                
                all_dfs.append(attack_df)
                
                # Update stats
                n_samples = len(attack_df)
                self.stats['attack_distribution'][attack_type] = n_samples
                self.stats['total_samples'] += n_samples
                
                self.logger.info(f"✓ {attack_type}: {n_samples:,} samples")
        
        unified_df = pd.concat(all_dfs, ignore_index=True)
        
        # Balance classes if requested
        if balance_classes:
            unified_df = self._balance_classes(unified_df)
        
        return unified_df
    
    def _balance_classes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Balance attack type distribution using undersampling."""
        self.logger.info("Balancing class distribution...")
        
        # Find minimum class size
        min_samples = df['attack_label'].value_counts().min()
        
        balanced_dfs = []
        for attack_label in df['attack_label'].unique():
            attack_df = df[df['attack_label'] == attack_label]
            if len(attack_df) > min_samples:
                attack_df = attack_df.sample(n=min_samples, random_state=42)
            balanced_dfs.append(attack_df)
        
        balanced_df = pd.concat(balanced_dfs, ignore_index=True)
        balanced_df = balanced_df.sample(frac=1, random_state=42).reset_index(drop=True)
        
        self.logger.info(f"Balanced from {len(df)} to {len(balanced_df)} samples")
        return balanced_df
    
    def create_train_test_split(self,
                                df: pd.DataFrame,
                                test_size: float = 0.2,
                                val_size: float = 0.1) -> Dict[str, pd.DataFrame]:
        """Create stratified train/val/test splits."""
        # First split: train+val vs test
        train_val, test = train_test_split(
            df, 
            test_size=test_size,
            stratify=df['attack_label'],
            random_state=42
        )
        
        # Second split: train vs val
        if val_size > 0:
            val_size_adjusted = val_size / (1 - test_size)
            train, val = train_test_split(
                train_val,
                test_size=val_size_adjusted,
                stratify=train_val['attack_label'],
                random_state=42
            )
            return {'train': train, 'val': val, 'test': test}
        else:
            return {'train': train_val, 'test': test}
    
    # ========================================================================
    # SAVE & EXPORT
    # ========================================================================
    
    def save_datasets(self, 
                     splits: Dict[str, pd.DataFrame],
                     format: str = 'csv') -> Dict[str, Path]:
        """Save dataset splits to disk."""
        saved_paths = {}
        
        for split_name, df in splits.items():
            if format == 'csv':
                filename = f"{split_name}_{self.version}.csv"
                filepath = self.version_dir / filename
                df.to_csv(filepath, index=False)
            elif format == 'parquet':
                filename = f"{split_name}_{self.version}.parquet"
                filepath = self.version_dir / filename
                df.to_parquet(filepath, index=False)
            elif format == 'feather':
                filename = f"{split_name}_{self.version}.feather"
                filepath = self.version_dir / filename
                df.to_feather(filepath)
            
            saved_paths[split_name] = filepath
            self.logger.info(f"Saved {split_name} split: {filepath}")
        
        return saved_paths
    
    def save_metadata(self, 
                     splits: Dict[str, pd.DataFrame],
                     saved_paths: Dict[str, Path]):
        """Save dataset metadata as JSON."""
        metadata = {
            'version': self.version,
            'created': datetime.now().isoformat(),
            'total_samples': self.stats['total_samples'],
            'files_processed': self.stats['files_processed'],
            'attack_distribution': self.stats['attack_distribution'],
            'splits': {},
            'feature_count': len(splits['train'].columns) if 'train' in splits else 0,
            'data_quality_issues': self.stats['data_quality_issues']
        }
        
        for split_name, df in splits.items():
            metadata['splits'][split_name] = {
                'samples': len(df),
                'filepath': str(saved_paths[split_name]),
                'attack_distribution': df['attack_type'].value_counts().to_dict()
            }
        
        metadata_path = self.version_dir / 'metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.logger.info(f"Saved metadata: {metadata_path}")
    
    def save_scalers(self, train_df: pd.DataFrame) -> Dict:
        """
        Fit and save StandardScaler on training data.
        NOW WITH INF/NAN VALIDATION.
        """
        self.logger.info("Fitting StandardScaler on training data...")
        
        # Identify numeric feature columns
        exclude_cols = [
            'attack_type', 'attack_label', 'source_file', 
            'session_id', 'alarm', 'fw_mode', 'sg_relief'
        ]
        numeric_cols = [col for col in train_df.columns 
                       if col not in exclude_cols 
                       and pd.api.types.is_numeric_dtype(train_df[col])]
        
        # CRITICAL: Validate data before scaling
        train_numeric = train_df[numeric_cols]

        for col in numeric_cols.copy():
            if train_df[col].nunique() <= 1:
                numeric_cols.remove(col)
                self.logger.info(f"Removed zero-variance column: {col}")
        
        temp_out_variance      : max = 3.28e+10
        pressure_core_variance : max = 1.84e+10
        
        # Check for inf/NaN
        n_inf = np.isinf(train_numeric.values).sum()
        n_nan = train_numeric.isna().sum().sum()
        
        if n_inf > 0 or n_nan > 0:
            self.logger.error(f"Training data has {n_inf} inf and {n_nan} NaN values!")
            self.logger.error("This should not happen - cleaning was insufficient")
            
            # Emergency cleaning
            train_numeric = train_numeric.replace([np.inf, -np.inf], np.nan)
            train_numeric = train_numeric.fillna(0)
            train_df[numeric_cols] = train_numeric
        
        # Fit scaler
        scaler = StandardScaler()
        scaler.fit(train_df[numeric_cols])
        
        # Save scaler
        scaler_path = self.version_dir / 'scaler.pkl'
        with open(scaler_path, 'wb') as f:
            pickle.dump({
                'scaler': scaler,
                'feature_names': numeric_cols
            }, f)
        
        self.logger.info(f"Saved StandardScaler: {scaler_path}")
        
        return {'scaler': scaler, 'feature_names': numeric_cols}
    
    # ========================================================================
    # CONVENIENCE METHODS
    # ========================================================================
    
    def build_complete_dataset(self,
                              add_features: bool = True,
                              balance_classes: bool = False,
                              test_size: float = 0.2,
                              val_size: float = 0.1,
                              save_format: str = 'csv') -> Dict[str, Path]:
        """One-shot method to build complete dataset pipeline."""
        self.logger.info("="*70)
        self.logger.info(f"Building NICSSIM Dataset v{self.version}")
        self.logger.info(f"Data quality validation: {'ENABLED' if self.enable_validation else 'DISABLED'}")
        self.logger.info("="*70)
        
        # 1. Discover files
        file_map = self.discover_log_files()
        if not file_map:
            raise ValueError(f"No log files found in {self.log_root_dir}")
        
        # 2. Build unified dataset
        unified_df = self.build_unified_dataset(
            file_map, 
            add_features=add_features,
            balance_classes=balance_classes
        )
        
        # 3. Create splits
        splits = self.create_train_test_split(
            unified_df,
            test_size=test_size,
            val_size=val_size
        )
        
        # 4. Save datasets
        saved_paths = self.save_datasets(splits, format=save_format)
        
        # 5. Save metadata
        self.save_metadata(splits, saved_paths)
        
        # 6. Fit and save scalers
        if 'train' in splits:
            self.save_scalers(splits['train'])
        
        # 7. Generate summary report
        self._generate_summary_report(splits)
        
        self.logger.info("="*70)
        self.logger.info("✓ Dataset build complete!")
        self.logger.info(f"Output directory: {self.version_dir}")
        self.logger.info("="*70)
        
        return saved_paths
    
    def _generate_summary_report(self, splits: Dict[str, pd.DataFrame]):
        """Generate human-readable summary report."""
        report_path = self.version_dir / 'SUMMARY.txt'
        
        with open(report_path, 'w') as f:
            f.write("="*70 + "\n")
            f.write(f"NICSSIM DATASET BUILD SUMMARY\n")
            f.write(f"Version: {self.version}\n")
            f.write(f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*70 + "\n\n")
            
            f.write(f"Files Processed: {self.stats['files_processed']}\n")
            f.write(f"Total Samples: {self.stats['total_samples']:,}\n\n")
            
            f.write("Attack Type Distribution:\n")
            for attack, count in self.stats['attack_distribution'].items():
                pct = count / self.stats['total_samples'] * 100
                f.write(f"  {attack:20s}: {count:7,} ({pct:5.1f}%)\n")
            
            f.write("\n" + "-"*70 + "\n")
            f.write("Dataset Splits:\n")
            for name, df in splits.items():
                if len(df) > 0:
                    f.write(f"\n{name.upper()}:\n")
                    f.write(f"  Samples: {len(df):,}\n")
                    f.write(f"  Features: {len(df.columns)}\n")
                    f.write("  Attack Distribution:\n")
                    for attack, count in df['attack_type'].value_counts().items():
                        f.write(f"    {attack:20s}: {count:7,}\n")
            
            if self.stats['processing_errors']:
                f.write("\n" + "-"*70 + "\n")
                f.write(f"Processing Errors ({len(self.stats['processing_errors'])}):\n")
                for error in self.stats['processing_errors']:
                    f.write(f"  {error['file']}: {error['error']}\n")
            
            if self.stats['data_quality_issues']:
                f.write("\n" + "-"*70 + "\n")
                f.write(f"Data Quality Issues:\n")
                f.write(f"  {len(self.stats['data_quality_issues'])} validation reports saved\n")
                f.write(f"  See build_log.txt for details\n")
            
            f.write("\n" + "="*70 + "\n")
        
        self.logger.info(f"Summary report: {report_path}")


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Build ML training datasets from NICSSIM logs (FIXED VERSION)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python dataset_builder.py --log-dir src/logs --version v1_phase1
  
  # Quick test
  python dataset_builder.py --quick-test
  
  # With validation disabled (faster)
  python dataset_builder.py --no-validation
        """
    )
    
    parser.add_argument('--log-dir', default='src/logs',
                       help='Root directory containing log files')
    parser.add_argument('--output-dir', default='datasets',
                       help='Output directory for processed datasets')
    parser.add_argument('--version', default=None,
                       help='Dataset version (auto-generated if not specified)')
    parser.add_argument('--format', choices=['csv', 'parquet', 'feather'],
                       default='csv', help='Output file format')
    parser.add_argument('--no-features', action='store_true',
                       help='Skip advanced feature engineering')
    parser.add_argument('--balance', action='store_true',
                       help='Balance attack type distribution')
    parser.add_argument('--test-size', type=float, default=0.2,
                       help='Test set fraction (default: 0.2)')
    parser.add_argument('--val-size', type=float, default=0.1,
                       help='Validation set fraction (default: 0.1)')
    parser.add_argument('--no-validation', action='store_true',
                       help='Disable data quality validation (faster)')
    parser.add_argument('--quick-test', action='store_true',
                       help='Quick test mode (minimal features, first 1000 samples)')
    
    args = parser.parse_args()
    
    # Initialize builder
    builder = DatasetBuilder(
        log_root_dir=args.log_dir,
        output_dir=args.output_dir,
        version=args.version,
        enable_validation=not args.no_validation
    )
    
    # Build dataset
    try:
        if args.quick_test:
            print("\n⚡ Quick Test Mode - Minimal processing for rapid testing\n")
            file_map = builder.discover_log_files()
            file_map = {k: v[:1] for k, v in file_map.items()}
            
            unified_df = builder.build_unified_dataset(
                file_map, 
                add_features=False,
                balance_classes=False
            )
            
            if len(unified_df) > 1000:
                unified_df = unified_df.head(1000)
            
            splits = builder.create_train_test_split(
                unified_df,
                test_size=0.3,
                val_size=0.0
            )
            
            saved_paths = builder.save_datasets(splits, format='csv')
            builder.save_metadata(splits, saved_paths)
            
            print(f"\n✓ Quick test complete! Output: {builder.version_dir}\n")
            
        else:
            # Full pipeline
            saved_paths = builder.build_complete_dataset(
                add_features=not args.no_features,
                balance_classes=args.balance,
                test_size=args.test_size,
                val_size=args.val_size,
                save_format=args.format
            )
        
        print(f"\n✓ Dataset successfully built!")
        print(f" Location: {builder.version_dir}")
        print(f" Files: {list(saved_paths.keys())}")
        print(f" Total samples: {builder.stats['total_samples']:,}")
        
    except Exception as e:
        print(f"\n Error building dataset: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
import pandas as pd
import pickle
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
import glob


# Feature columns to use for anomaly detection
FEATURE_COLS = [
    'flux', 'temp_out', 'pressure_core', 'flow',
    'pressure_sg_in', 'sg_level', 'fw_flow',
    'temp_diff', 'pressure_diff', 'flux_error'  
]

def add_derived_features(df):
    df['temp_diff'] = df['temp_out'] - df['temp_in']
    df['pressure_diff'] = df['pressure_core'] - df['pressure_sg_in']
    df['flux_error'] = df['flux'] - df['flux_sp']
    return df

def train_supervised_detector(dataset_dir="datasets/vv1_phase1"):
    """Train supervised detector on labeled attack data."""
    
    print("="*70)
    print("TRAINING SUPERVISED ANOMALY DETECTOR")
    print("="*70)

    train_file = glob.glob(f"{dataset_dir}/train_*.csv")[0]
    val_file = glob.glob(f"{dataset_dir}/val_*.csv")[0]
    test_file = glob.glob(f"{dataset_dir}/test_*.csv")[0]

    
    # 1. Load the dataset splits
    train_df = pd.read_csv(train_file)
    val_df = pd.read_csv(val_file)
    test_df = pd.read_csv(test_file)
    
    print(f"\n✓ Loaded data from {dataset_dir}:")
    print(f"  Train: {train_file}")
    print(f"  Train: {len(train_df):,} samples")
    print(f"  Test:  {len(test_df):,} samples")
    
    # 2. Load the pre-fitted scaler
    with open(f"{dataset_dir}/scaler.pkl", 'rb') as f:
        scaler_data = pickle.load(f)
    
    scaler = scaler_data['scaler']
    feature_names = scaler_data['feature_names']
    
    print(f"\n✓ Loaded scaler with {len(feature_names)} features")
    
    # Debug: Check unique labels
    print(f"\nDebug Info:")
    print(f"  Unique labels in train: {sorted(train_df['attack_label'].unique())}")
    print(f"  Attack distribution:")
    for label in sorted(train_df['attack_label'].unique()):
        count = (train_df['attack_label'] == label).sum()
        attack_name = [k for k, v in ATTACK_TYPES.items() if v == label][0]
        print(f"    {label} ({attack_name}): {count:,} samples")

    # 3. Drop zero-variance columns (identified in validation)
    print(f"✓ Training with {len(feature_names)} features")

    print(f"✓ Training with {len(feature_names)} features")

    # 4. Prepare features and labels
    X_train = train_df[feature_names].values
    y_train = train_df['attack_label'].values
    
    X_val = val_df[feature_names].values
    y_val = val_df['attack_label'].values
    
    X_test = test_df[feature_names].values
    y_test = test_df['attack_label'].values
    
    # 5. Scale features (already fitted on training data)
    X_train_scaled = scaler.transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n" + "-"*70)
    print("Training Random Forest Classifier...")
    print("-"*70)
    
    # 6. Train Random Forest (fast, interpretable, good baseline)
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report, confusion_matrix
    
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        min_samples_split=10,
        random_state=42,
        n_jobs=-1
    )
    
    clf.fit(X_train_scaled, y_train)
    
    # 7. Evaluate
    print("\n✓ Training complete!\n")
    
    print("="*70)
    print("VALIDATION SET PERFORMANCE")
    print("="*70)
    val_pred = clf.predict(X_val_scaled)
    val_acc = (val_pred == y_val).mean()
    print(f"\nAccuracy: {val_acc*100:.2f}%\n")
    print(classification_report(y_val, val_pred, 
                                target_names=list(ATTACK_TYPES.keys())))
    
    print("\n" + "="*70)
    print("TEST SET PERFORMANCE")
    print("="*70)
    test_pred = clf.predict(X_test_scaled)
    test_acc = (test_pred == y_test).mean()
    print(f"\nAccuracy: {test_acc*100:.2f}%\n")
    print(classification_report(y_test, test_pred,
                                target_names=list(ATTACK_TYPES.keys())))
    
    # 8. Save model
    model_path = "src/defender/rf_classifier.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': clf,
            'scaler': scaler,
            'feature_names': feature_names,
            'attack_types': ATTACK_TYPES
        }, f)
    
    print(f"\n✓ Saved model to {model_path}")
    
    return clf, scaler, feature_names


# Attack types mapping (add at top of file after imports)
ATTACK_TYPES = {
    'baseline': 0,
    'sensor-spike': 1,
    'sensor-freeze': 2,
    'ddos': 3,
    'command-injection': 4,
    'mitm': 5,
    'replay': 6,
    
}


if __name__ == "__main__":
    import sys
    
    dataset_dir = "datasets/vv1_phase1_fixed"
    if len(sys.argv) > 1:
        dataset_dir = sys.argv[1]
    
    clf, scaler, features = train_supervised_detector(dataset_dir)
    
    print("\n" + "="*70)
    print("✓ Detector ready!")
    print("="*70)
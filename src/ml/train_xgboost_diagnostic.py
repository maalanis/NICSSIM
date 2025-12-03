#!/usr/bin/env python3
"""
XGBoost Diagnostic Trainer for NICSSIM
Comprehensive diagnostics to test if 99% accuracy indicates problem is too easy
"""

import sys
import os
import json
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report, roc_curve, auc
)
from sklearn.preprocessing import LabelBinarizer
import xgboost as xgb
from collections import Counter

# Set plotting style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 8)


def load_dataset(dataset_path):
    """Load train/val/test datasets"""
    print("\n" + "="*70)
    print("LOADING DATASET")
    print("="*70)
    
    # Check for timestamped files first, then fall back to simple names
    import glob
    
    def find_file(pattern):
        matches = glob.glob(f"{dataset_path}/{pattern}")
        if matches:
            # Return the most recent file if multiple matches
            return sorted(matches)[-1]
        # Fall back to simple name
        simple_name = pattern.replace("*", "")
        simple_path = f"{dataset_path}/{simple_name}"
        if os.path.exists(simple_path):
            return simple_path
        raise FileNotFoundError(f"Could not find file matching {pattern} in {dataset_path}")
    
    train_file = find_file("train*.csv")
    val_file = find_file("val*.csv")
    test_file = find_file("test*.csv")
    
    print(f"   Loading: {os.path.basename(train_file)}")
    print(f"   Loading: {os.path.basename(val_file)}")
    print(f"   Loading: {os.path.basename(test_file)}")
    
    train_df = pd.read_csv(train_file)
    val_df = pd.read_csv(val_file)
    test_df = pd.read_csv(test_file)
    
    # Separate features and labels
    X_train = train_df.drop('attack_label', axis=1)
    y_train = train_df['attack_label']
    X_val = val_df.drop('attack_label', axis=1)
    y_val = val_df['attack_label']
    X_test = test_df.drop('attack_label', axis=1)
    y_test = test_df['attack_label']
    
    # Also drop timestamp if present (not a feature)
    if 'timestamp' in X_train.columns:
        X_train = X_train.drop('timestamp', axis=1)
        X_val = X_val.drop('timestamp', axis=1)
        X_test = X_test.drop('timestamp', axis=1)
    
    print(f"   Train: {len(train_df):,} samples")
    print(f"   Val:   {len(val_df):,} samples")
    print(f"   Test:  {len(test_df):,} samples")
    print(f"   Features: {len(X_train.columns)}")
    
    # Print class distribution
    print("\n   Class Distribution:")
    train_dist = Counter(y_train)
    for label, count in sorted(train_dist.items()):
        percentage = (count / len(y_train)) * 100
        print(f"      {str(label):12s}: {count:8,} ({percentage:5.2f}%)")
    
    return X_train, y_train, X_val, y_val, X_test, y_test


def calculate_scale_pos_weight(y_train):
    """Calculate scale_pos_weight for each class to handle imbalance"""
    class_counts = Counter(y_train)
    total = sum(class_counts.values())
    
    # For multiclass, we'll use a different approach
    # Calculate ratio of negative to positive for each class
    weights = {}
    for label in class_counts:
        neg_count = total - class_counts[label]
        pos_count = class_counts[label]
        weights[label] = neg_count / pos_count
    
    return weights


def train_xgboost_with_learning_curve(X_train, y_train, X_val, y_val, 
                                      n_estimators=100, max_depth=6, 
                                      learning_rate=0.1):
    """Train XGBoost and track learning curves"""
    print("\n" + "="*70)
    print("TRAINING XGBOOST CLASSIFIER")
    print("="*70)
    print(f"  n_estimators: {n_estimators}")
    print(f"  max_depth: {max_depth}")
    print(f"  learning_rate: {learning_rate}")
    
    # Create DMatrix for XGBoost (more efficient)
    dtrain = xgb.DMatrix(X_train, label=pd.Categorical(y_train).codes)
    dval = xgb.DMatrix(X_val, label=pd.Categorical(y_val).codes)
    
    # Get class mapping
    class_names = sorted(y_train.unique())
    num_classes = len(class_names)
    
    print(f"  num_classes: {num_classes}")
    print(f"  classes: {class_names}")
    
    # XGBoost parameters
    params = {
        'objective': 'multi:softmax',
        'num_class': num_classes,
        'max_depth': max_depth,
        'learning_rate': learning_rate,
        'eval_metric': 'mlogloss',
        'tree_method': 'hist',
        'seed': 42
    }
    
    # Track evaluation results
    evals_result = {}
    
    print("\n  Training with learning curve tracking...")
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=n_estimators,
        evals=[(dtrain, 'train'), (dval, 'val')],
        evals_result=evals_result,
        verbose_eval=False
    )
    
    print("   Training complete!")
    
    # Convert predictions back to original labels
    train_pred_codes = model.predict(dtrain)
    val_pred_codes = model.predict(dval)
    
    train_pred = [class_names[int(code)] for code in train_pred_codes]
    val_pred = [class_names[int(code)] for code in val_pred_codes]
    
    train_acc = accuracy_score(y_train, train_pred)
    val_acc = accuracy_score(y_val, val_pred)
    
    print(f"\n  Final Training Accuracy: {train_acc*100:.2f}%")
    print(f"  Final Validation Accuracy: {val_acc*100:.2f}%")
    
    return model, evals_result, class_names


def plot_learning_curves(evals_result, output_dir):
    """Plot training vs validation learning curves"""
    print("\n   Generating learning curves...")
    
    epochs = len(evals_result['train']['mlogloss'])
    
    fig, ax = plt.subplots(1, 1, figsize=(10, 6))
    
    ax.plot(range(epochs), evals_result['train']['mlogloss'], 
            label='Training', linewidth=2, color='blue')
    ax.plot(range(epochs), evals_result['val']['mlogloss'], 
            label='Validation', linewidth=2, color='orange')
    
    ax.set_xlabel('Boosting Rounds', fontsize=12)
    ax.set_ylabel('Log Loss', fontsize=12)
    ax.set_title('XGBoost Learning Curves (Train vs Validation)', fontsize=14, fontweight='bold')
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    # Check for overfitting
    final_train_loss = evals_result['train']['mlogloss'][-1]
    final_val_loss = evals_result['val']['mlogloss'][-1]
    gap = final_val_loss - final_train_loss
    
    ax.text(0.95, 0.95, 
            f'Train Loss: {final_train_loss:.4f}\nVal Loss: {final_val_loss:.4f}\nGap: {gap:.4f}',
            transform=ax.transAxes,
            verticalalignment='top',
            horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5),
            fontsize=10)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/learning_curves.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved: {output_dir}/learning_curves.png")
    
    # Diagnostic interpretation
    if gap < 0.01:
        print("   ⚠️  Train and validation losses are nearly identical")
        print("      → Suggests problem might be too easy or no overfitting")
    elif gap > 0.1:
        print("   ⚠️  Significant gap between train and validation")
        print("      → Model is overfitting")
    else:
        print("   ✓  Healthy gap between train and validation losses")


def evaluate_model(model, X, y, class_names, dataset_name="Test"):
    """Evaluate model and return metrics"""
    # Create DMatrix
    dtest = xgb.DMatrix(X)
    
    # Predict
    pred_codes = model.predict(dtest)
    y_pred = [class_names[int(code)] for code in pred_codes]
    
    # Calculate metrics
    accuracy = accuracy_score(y, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y, y_pred, labels=class_names, zero_division=0
    )
    
    print(f"\n{dataset_name.upper()} SET:")
    print(f"  Accuracy: {accuracy*100:.2f}%")
    print()
    print(classification_report(y, y_pred, labels=class_names, zero_division=0))
    
    return {
        'accuracy': accuracy,
        'precision': precision.tolist(),
        'recall': recall.tolist(),
        'f1': f1.tolist(),
        'support': support.tolist(),
        'predictions': y_pred
    }


def plot_confusion_matrix(y_true, y_pred, class_names, output_dir, dataset_name="Test"):
    """Plot confusion matrix"""
    cm = confusion_matrix(y_true, y_pred, labels=class_names)
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Normalize by row (true labels)
    cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]
    
    sns.heatmap(cm_normalized, annot=cm, fmt='d', cmap='Blues', 
                xticklabels=class_names, yticklabels=class_names,
                cbar_kws={'label': 'Normalized Count'},
                ax=ax, annot_kws={'size': 12})
    
    ax.set_xlabel('Predicted Label', fontsize=12)
    ax.set_ylabel('True Label', fontsize=12)
    ax.set_title(f'XGBoost Confusion Matrix - {dataset_name} Set', 
                 fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/confusion_matrix_{dataset_name.lower()}.png', 
                dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved: {output_dir}/confusion_matrix_{dataset_name.lower()}.png")


def plot_feature_importance(model, feature_names, output_dir, top_n=20):
    """Plot feature importance and return importance dict"""
    print("\n   Generating feature importance plot...")
    
    # Get importance scores
    importance_dict = model.get_score(importance_type='gain')
    
    # Map back to feature names (XGBoost uses f0, f1, f2...)
    feature_importance = {}
    for i, fname in enumerate(feature_names):
        fkey = f'f{i}'
        feature_importance[fname] = importance_dict.get(fkey, 0)
    
    # Sort by importance
    sorted_features = sorted(feature_importance.items(), 
                            key=lambda x: x[1], reverse=True)
    
    # Get top N
    top_features = sorted_features[:top_n]
    features, importances = zip(*top_features)
    
    # Normalize to sum to 1
    total_importance = sum(importances)
    if total_importance == 0:
        print("   ⚠️  Warning: All features have zero importance!")
        print("      Using raw values instead of normalization")
        importances = list(importances)  # Keep original values
    else:
        importances = [imp / total_importance for imp in importances]
    
    # Plot
    fig, ax = plt.subplots(figsize=(12, 8))
    
    y_pos = np.arange(len(features))
    colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(features)))
    
    ax.barh(y_pos, importances, color=colors, edgecolor='black', linewidth=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(features, fontsize=10)
    ax.invert_yaxis()
    ax.set_xlabel('Normalized Importance (Gain)', fontsize=12)
    ax.set_title(f'XGBoost Feature Importance (Top {top_n})', 
                 fontsize=14, fontweight='bold')
    ax.grid(axis='x', alpha=0.3)
    
    # Add value labels
    for i, (feature, imp) in enumerate(zip(features, importances)):
        ax.text(imp, i, f' {imp:.4f}', 
                va='center', fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/feature_importance.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved: {output_dir}/feature_importance.png")
    
    # Print top features
    print(f"\nTop {top_n} most important features:")
    for i, (feature, imp) in enumerate(top_features, 1):
        print(f"   {i:2d}. {feature:30s}: {imp:.4f}")
    
    return feature_importance


def hyperparameter_sensitivity_analysis(X_train, y_train, X_val, y_val, 
                                        class_names, output_dir):
    """Test sensitivity to max_depth hyperparameter"""
    print("\n" + "="*70)
    print("HYPERPARAMETER SENSITIVITY ANALYSIS")
    print("="*70)
    
    depths = [3, 6, 10, 20]
    results = []
    
    dtrain = xgb.DMatrix(X_train, label=pd.Categorical(y_train).codes)
    dval = xgb.DMatrix(X_val, label=pd.Categorical(y_val).codes)
    
    for depth in depths:
        print(f"\n  Testing max_depth={depth}...")
        
        params = {
            'objective': 'multi:softmax',
            'num_class': len(class_names),
            'max_depth': depth,
            'learning_rate': 0.1,
            'eval_metric': 'mlogloss',
            'tree_method': 'hist',
            'seed': 42
        }
        
        model = xgb.train(
            params,
            dtrain,
            num_boost_round=100,
            evals=[(dval, 'val')],
            verbose_eval=False
        )
        
        # Evaluate
        val_pred_codes = model.predict(dval)
        val_pred = [class_names[int(code)] for code in val_pred_codes]
        val_acc = accuracy_score(y_val, val_pred)
        
        results.append({
            'depth': depth,
            'val_accuracy': val_acc
        })
        
        print(f"     Validation Accuracy: {val_acc*100:.2f}%")
    
    # Plot results
    fig, ax = plt.subplots(figsize=(10, 6))
    
    depths_list = [r['depth'] for r in results]
    accuracies = [r['val_accuracy'] * 100 for r in results]
    
    ax.plot(depths_list, accuracies, marker='o', linewidth=2, 
            markersize=10, color='darkblue')
    ax.set_xlabel('Max Depth', fontsize=12)
    ax.set_ylabel('Validation Accuracy (%)', fontsize=12)
    ax.set_title('XGBoost Sensitivity to max_depth', fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)
    ax.set_ylim([min(accuracies) - 2, 100])
    
    # Add value labels
    for depth, acc in zip(depths_list, accuracies):
        ax.text(depth, acc + 0.5, f'{acc:.2f}%', 
                ha='center', fontsize=10, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/hyperparameter_sensitivity.png', 
                dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"\n   Saved: {output_dir}/hyperparameter_sensitivity.png")
    
    # Interpretation
    acc_range = max(accuracies) - min(accuracies)
    if acc_range < 1.0:
        print("\n   ⚠️  Accuracy barely changes with max_depth")
        print("      → Features are very separable (problem might be too easy)")
    elif acc_range < 5.0:
        print("\n   ✓  Moderate sensitivity to max_depth")
    else:
        print("\n   ✓  High sensitivity to max_depth (complex decision boundaries)")
    
    return results


def plot_per_class_metrics(metrics, class_names, output_dir):
    """Plot precision, recall, F1 per class"""
    fig, ax = plt.subplots(figsize=(12, 6))
    
    x = np.arange(len(class_names))
    width = 0.25
    
    precision = [metrics['precision'][i] for i in range(len(class_names))]
    recall = [metrics['recall'][i] for i in range(len(class_names))]
    f1 = [metrics['f1'][i] for i in range(len(class_names))]
    
    ax.bar(x - width, precision, width, label='Precision', color='skyblue', edgecolor='black')
    ax.bar(x, recall, width, label='Recall', color='lightcoral', edgecolor='black')
    ax.bar(x + width, f1, width, label='F1-Score', color='lightgreen', edgecolor='black')
    
    ax.set_xlabel('Attack Type', fontsize=12)
    ax.set_ylabel('Score', fontsize=12)
    ax.set_title('XGBoost Per-Class Detection Performance', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(class_names, fontsize=11)
    ax.legend(fontsize=11)
    ax.set_ylim([0, 1.1])
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for i, (p, r, f) in enumerate(zip(precision, recall, f1)):
        ax.text(i - width, p + 0.02, f'{p:.2f}', ha='center', fontsize=8)
        ax.text(i, r + 0.02, f'{r:.2f}', ha='center', fontsize=8)
        ax.text(i + width, f + 0.02, f'{f:.2f}', ha='center', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/per_class_metrics.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved: {output_dir}/per_class_metrics.png")


def compare_with_random_forest(rf_results_path, xgb_feature_importance, output_dir):
    """Compare XGBoost results with Random Forest if available"""
    print("\n" + "="*70)
    print("COMPARING WITH RANDOM FOREST")
    print("="*70)
    
    if not os.path.exists(rf_results_path):
        print(f"   Random Forest results not found at: {rf_results_path}")
        print("   Skipping comparison.")
        return
    
    # Load RF metrics
    with open(rf_results_path, 'r') as f:
        rf_metrics = json.load(f)
    
    # Load RF model to get feature importance
# Load RF model to get feature importance
    rf_model_path = os.path.join(os.path.dirname(rf_results_path), 
                                'random_forest_model.pkl')
    if os.path.exists(rf_model_path):
        with open(rf_model_path, 'rb') as f:
            rf_data = pickle.load(f)
        
        # Handle both dict and model object
        if isinstance(rf_data, dict):
            if 'feature_importances' in rf_data:
                rf_importance = rf_data['feature_importances']
            else:
                print("   Could not find feature importance in RF pickle file")
                return
        else:
            rf_importance = dict(zip(rf_data.feature_names_in_, 
                                    rf_data.feature_importances_))
    else:
        print("   Could not load RF model for feature comparison")
        return
    
    # Compare accuracies
    print("\n   Accuracy Comparison:")
    print(f"      Random Forest:  {rf_metrics['test_accuracy']*100:.2f}%")
    print(f"      XGBoost:        (will be filled in)")
    
    # Compare top features
    print("\n   Top 10 Feature Comparison:")
    
    # Get top 10 from each
    rf_top = sorted(rf_importance.items(), key=lambda x: x[1], reverse=True)[:10]
    xgb_top = sorted(xgb_feature_importance.items(), key=lambda x: x[1], reverse=True)[:10]
    
    rf_top_names = [f[0] for f in rf_top]
    xgb_top_names = [f[0] for f in xgb_top]
    
    # Find overlap
    overlap = set(rf_top_names) & set(xgb_top_names)
    
    print(f"\n   Features in both top-10: {len(overlap)}/10")
    print(f"   Overlapping features: {', '.join(sorted(overlap))}")
    
    # Plot side-by-side comparison
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    
    # RF features
    rf_names, rf_vals = zip(*rf_top)
    y_pos = np.arange(len(rf_names))
    ax1.barh(y_pos, rf_vals, color='steelblue', edgecolor='black')
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(rf_names, fontsize=10)
    ax1.invert_yaxis()
    ax1.set_xlabel('Importance', fontsize=11)
    ax1.set_title('Random Forest Top 10 Features', fontsize=13, fontweight='bold')
    ax1.grid(axis='x', alpha=0.3)
    
    # XGBoost features
    xgb_names, xgb_vals = zip(*xgb_top)
    ax2.barh(y_pos, xgb_vals, color='darkorange', edgecolor='black')
    ax2.set_yticks(y_pos)
    ax2.set_yticklabels(xgb_names, fontsize=10)
    ax2.invert_yaxis()
    ax2.set_xlabel('Importance', fontsize=11)
    ax2.set_title('XGBoost Top 10 Features', fontsize=13, fontweight='bold')
    ax2.grid(axis='x', alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/rf_vs_xgb_features.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"   Saved: {output_dir}/rf_vs_xgb_features.png")
    
    # Diagnostic interpretation
    if len(overlap) >= 8:
        print("\n   ⚠️  Very high overlap in top features between RF and XGBoost")
        print("      → Strong consensus on discriminative features")
        print("      → These features may be 'too good' (problem might be easy)")
    elif len(overlap) >= 5:
        print("\n   ✓  Moderate overlap - both models agree on key features")
    else:
        print("\n   ⚠️  Low overlap - models using different features")
        print("      → May indicate multiple separable feature sets")


def main():
    if len(sys.argv) < 2:
        print("Usage: python train_xgboost_diagnostic.py <dataset_path> [output_dir]")
        print("Example: python train_xgboost_diagnostic.py datasets/nicssim_labeled")
        sys.exit(1)
    
    dataset_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "models/nicssim_xgboost_diagnostic"
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    print("="*70)
    print("NICSSIM XGBOOST DIAGNOSTIC ANALYSIS")
    print("="*70)
    print(f"Dataset: {dataset_path}")
    print(f"Output: {output_dir}")
    
    # Load data
    X_train, y_train, X_val, y_val, X_test, y_test = load_dataset(dataset_path)
    
    # Train XGBoost with learning curves
    model, evals_result, class_names = train_xgboost_with_learning_curve(
        X_train, y_train, X_val, y_val,
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1
    )
    
    # Plot learning curves
    plot_learning_curves(evals_result, output_dir)
    
    # Evaluate on validation set
    print("\n" + "="*70)
    print("MODEL EVALUATION")
    print("="*70)
    
    val_metrics = evaluate_model(model, X_val, y_val, class_names, "Validation")
    plot_confusion_matrix(y_val, val_metrics['predictions'], 
                         class_names, output_dir, "Validation")
    
    # Evaluate on test set
    test_metrics = evaluate_model(model, X_test, y_test, class_names, "Test")
    plot_confusion_matrix(y_test, test_metrics['predictions'], 
                         class_names, output_dir, "Test")
    
    # Feature importance
    feature_importance = plot_feature_importance(model, X_train.columns, 
                                                output_dir, top_n=20)
    
    # Per-class metrics plot
    plot_per_class_metrics(test_metrics, class_names, output_dir)
    
    # Hyperparameter sensitivity
    hyperparam_results = hyperparameter_sensitivity_analysis(
        X_train, y_train, X_val, y_val, class_names, output_dir
    )
    
    # Save model and metrics
    print("\n" + "="*70)
    print("SAVING MODEL AND RESULTS")
    print("="*70)
    
    model.save_model(f'{output_dir}/xgboost_model.json')
    print(f"   Model: {output_dir}/xgboost_model.json")
    
    # Save metrics
    results = {
    'test_accuracy': float(test_metrics['accuracy']),
    'val_accuracy': float(val_metrics['accuracy']),
    'test_precision': test_metrics['precision'],
    'test_recall': test_metrics['recall'],
    'test_f1': test_metrics['f1'],
    'test_support': [int(s) for s in test_metrics['support']],
    'class_names': [int(c) if isinstance(c, (np.integer, int)) else str(c) for c in class_names],
    'hyperparameter_sensitivity': hyperparam_results,
    'feature_importance': {k: float(v) for k, v in feature_importance.items()}
    }
    
    with open(f'{output_dir}/metrics.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"   Metrics: {output_dir}/metrics.json")
    
    # Compare with Random Forest if available
    rf_metrics_path = "models/nicssim_detector/metrics.json"
    compare_with_random_forest(rf_metrics_path, feature_importance, output_dir)
    
    # Final diagnostic summary
    print("\n" + "="*70)
    print("DIAGNOSTIC SUMMARY")
    print("="*70)
    
    test_acc = test_metrics['accuracy'] * 100
    val_acc = val_metrics['accuracy'] * 100
    
    print(f"\n  Test Accuracy: {test_acc:.2f}%")
    
    if test_acc > 99:
        print("\n  🚩 DIAGNOSTIC: Accuracy > 99%")
        print("     This is suspiciously high for a cybersecurity task.")
        print("     Possible causes:")
        print("     1. Problem is too easy (attacks are too obvious)")
        print("     2. Data leakage (features contain future information)")
        print("     3. Unrealistic attack scenarios")
        print("\n     Recommendations:")
        print("     - Check feature importance for 'cheat' features")
        print("     - Compare with Autoencoder (unsupervised) results")
        print("     - Make attacks more subtle/stealthy")
    elif test_acc > 95:
        print("\n  ⚠️  DIAGNOSTIC: Accuracy 95-99%")
        print("     Good performance, but verify it's not too easy.")
        print("     Check if Random Forest also got similar accuracy.")
    else:
        print("\n  ✓  DIAGNOSTIC: Accuracy < 95%")
        print("     Realistic performance for a difficult problem.")
    
    print("\n" + "="*70)
    print(" XGBOOST DIAGNOSTIC COMPLETE!")
    print("="*70)
    print(f"\nResults saved to: {output_dir}")
    print("\nGenerated files:")
    print("  - xgboost_model.json             : Trained model")
    print("  - learning_curves.png            : Train vs Val convergence")
    print("  - confusion_matrix_test.png      : Confusion matrix")
    print("  - feature_importance.png         : Top features")
    print("  - per_class_metrics.png          : Detection performance")
    print("  - hyperparameter_sensitivity.png : max_depth analysis")
    print("  - rf_vs_xgb_features.png        : RF comparison (if available)")
    print("  - metrics.json                   : Numerical results")


if __name__ == "__main__":
    main()
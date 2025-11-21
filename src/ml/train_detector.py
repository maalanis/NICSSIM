#!/usr/bin/env python3
"""
train_detector.py

Train ML models for cyber-attack detection in nuclear ICS.
Generates publication-quality results: metrics, confusion matrices, feature importance.
"""

import pandas as pd
import numpy as np
import pickle
import json
import glob
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, precision_recall_fscore_support,
    roc_auc_score, roc_curve
)


# Attack type labels (must match dataset_builder.py)
ATTACK_LABELS = {
    'baseline': 0,
    'scan': 1,
    'replay': 2,
    'mitm': 3,
    'ddos': 4
}

# Reverse mapping for printing
LABEL_NAMES = {v: k for k, v in ATTACK_LABELS.items()}


class DetectorTrainer:
    """Train and evaluate cyber-attack detection models."""
    
    def __init__(self, dataset_dir):
        self.dataset_dir = Path(dataset_dir)
        
        # Load data
        print(f"{'='*70}")
        print(f"LOADING DATASET")
        print(f"{'='*70}")
        
        train_file = list(self.dataset_dir.glob("train_*.csv"))[0]
        val_file = list(self.dataset_dir.glob("val_*.csv"))[0]
        test_file = list(self.dataset_dir.glob("test_*.csv"))[0]
        
        self.train_df = pd.read_csv(train_file, index_col=0, parse_dates=[0])
        self.val_df = pd.read_csv(val_file, index_col=0, parse_dates=[0])
        self.test_df = pd.read_csv(test_file, index_col=0, parse_dates=[0])
        
        print(f"   Train: {len(self.train_df):,} samples")
        print(f"   Val:   {len(self.val_df):,} samples")
        print(f"   Test:  {len(self.test_df):,} samples")
        
        # Load scaler and metadata
        with open(self.dataset_dir / "scaler.pkl", 'rb') as f:
            scaler_data = pickle.load(f)
        
        self.scaler = scaler_data['scaler']
        self.feature_names = scaler_data['feature_names']
        
        with open(self.dataset_dir / "metadata.json", 'r') as f:
            self.metadata = json.load(f)
        
        print(f"   Features: {len(self.feature_names)}")
        
        # Prepare data
        self.X_train = self.scaler.transform(self.train_df[self.feature_names].values)
        self.y_train = self.train_df['attack_label'].values
        
        self.X_val = self.scaler.transform(self.val_df[self.feature_names].values)
        self.y_val = self.val_df['attack_label'].values
        
        self.X_test = self.scaler.transform(self.test_df[self.feature_names].values)
        self.y_test = self.test_df['attack_label'].values
        
        self.model = None
    
    def train_random_forest(self, n_estimators=100, max_depth=20):
        """Train Random Forest classifier."""
        print(f"\n{'='*70}")
        print(f"TRAINING RANDOM FOREST CLASSIFIER")
        print(f"{'='*70}")
        print(f"  n_estimators: {n_estimators}")
        print(f"  max_depth: {max_depth}")
        
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=10,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # Handle class imbalance
        )
        
        print("\n  Training...")
        self.model.fit(self.X_train, self.y_train)
        print("   Training complete!")
        
        return self.model
    
    def evaluate(self):
        """Evaluate model on validation and test sets."""
        print(f"\n{'='*70}")
        print(f"MODEL EVALUATION")
        print(f"{'='*70}")
        
        # Validation set
        print("\nVALIDATION SET:")
        val_pred = self.model.predict(self.X_val)
        val_acc = accuracy_score(self.y_val, val_pred)
        print(f"  Accuracy: {val_acc*100:.2f}%")
        
        # Get unique classes in validation set
        unique_classes = sorted(np.unique(np.concatenate([self.y_val, val_pred])))
        class_names = [LABEL_NAMES[i] for i in unique_classes]
        
        print("\n" + classification_report(
            self.y_val, val_pred,
            labels=unique_classes,
            target_names=class_names,
            digits=3
        ))
        
        # Test set
        print(f"\n{'='*70}")
        print("TEST SET:")
        test_pred = self.model.predict(self.X_test)
        test_acc = accuracy_score(self.y_test, test_pred)
        print(f"  Accuracy: {test_acc*100:.2f}%")
        
        # Get unique classes in test set
        unique_classes = sorted(np.unique(np.concatenate([self.y_test, test_pred])))
        class_names = [LABEL_NAMES[i] for i in unique_classes]
        
        print("\n" + classification_report(
            self.y_test, test_pred,
            labels=unique_classes,
            target_names=class_names,
            digits=3
        ))
        
        return {
            'val_accuracy': val_acc,
            'test_accuracy': test_acc,
            'val_predictions': val_pred,
            'test_predictions': test_pred
        }
    
    def plot_confusion_matrix(self, y_true, y_pred, title, save_path):
        """Plot confusion matrix."""
        cm = confusion_matrix(y_true, y_pred)
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=[LABEL_NAMES[i] for i in range(len(ATTACK_LABELS))],
            yticklabels=[LABEL_NAMES[i] for i in range(len(ATTACK_LABELS))],
            cbar_kws={'label': 'Count'}
        )
        plt.title(title, fontsize=14, fontweight='bold')
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"   Saved: {save_path}")
        plt.close()
    
    def plot_feature_importance(self, top_n=20, save_path=None):
        """Plot feature importance."""
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        
        plt.figure(figsize=(10, 8))
        plt.barh(range(top_n), importances[indices], color='steelblue')
        plt.yticks(range(top_n), [self.feature_names[i] for i in indices])
        plt.xlabel('Feature Importance', fontsize=12)
        plt.title(f'Top {top_n} Most Important Features', fontsize=14, fontweight='bold')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved: {save_path}")
        
        plt.close()
        
        # Print top features
        print(f"\nTop {top_n} most important features:")
        for i, idx in enumerate(indices, 1):
            print(f"  {i:2d}. {self.feature_names[idx]:30s}: {importances[idx]:.4f}")
    
    def plot_per_class_metrics(self, save_path):
        """Plot per-class precision, recall, F1."""
        test_pred = self.model.predict(self.X_test)
        
        # Get unique classes actually present
        unique_classes = sorted(np.unique(np.concatenate([self.y_test, test_pred])))
        
        precision, recall, f1, support = precision_recall_fscore_support(
            self.y_test, test_pred, labels=unique_classes, average=None
        )
        
        labels = [LABEL_NAMES[i] for i in unique_classes]
        
        x = np.arange(len(labels))
        width = 0.25
        
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.bar(x - width, precision, width, label='Precision', color='steelblue')
        ax.bar(x, recall, width, label='Recall', color='coral')
        ax.bar(x + width, f1, width, label='F1-Score', color='lightgreen')
        
        ax.set_ylabel('Score', fontsize=12)
        ax.set_title('Per-Class Detection Performance', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=45, ha='right')
        ax.legend(fontsize=10)
        ax.set_ylim([0, 1.05])
        ax.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"   Saved: {save_path}")
        plt.close()
    
    def save_model(self, output_dir):
        """Save trained model and results."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n{'='*70}")
        print(f"SAVING MODEL AND RESULTS")
        print(f"{'='*70}")
        
        # Save model
        model_file = output_dir / "random_forest_model.pkl"
        with open(model_file, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'attack_labels': ATTACK_LABELS
            }, f)
        print(f"   Model: {model_file}")
        
        # Generate and save plots
        results = self.evaluate()
        
        # Confusion matrices
        self.plot_confusion_matrix(
            self.y_test, results['test_predictions'],
            'Test Set Confusion Matrix',
            output_dir / 'confusion_matrix_test.png'
        )
        
        # Feature importance
        self.plot_feature_importance(
            top_n=20,
            save_path=output_dir / 'feature_importance.png'
        )
        
        # Per-class metrics
        self.plot_per_class_metrics(
            output_dir / 'per_class_metrics.png'
        )
        
        # Save metrics to JSON
        test_pred = self.model.predict(self.X_test)
        
        # Get unique classes
        unique_classes = sorted(np.unique(np.concatenate([self.y_test, test_pred])))
        
        precision, recall, f1, support = precision_recall_fscore_support(
            self.y_test, test_pred, labels=unique_classes, average=None
        )
        
        metrics = {
            'test_accuracy': float(results['test_accuracy']),
            'val_accuracy': float(results['val_accuracy']),
            'per_class_metrics': {}
        }
        
        for i, class_idx in enumerate(unique_classes):
            label_name = LABEL_NAMES[class_idx]
            metrics['per_class_metrics'][label_name] = {
                'precision': float(precision[i]),
                'recall': float(recall[i]),
                'f1_score': float(f1[i]),
                'support': int(support[i])
            }
        
        metrics_file = output_dir / 'metrics.json'
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"   Metrics: {metrics_file}")
        
        print(f"\n Results saved to: {output_dir}")
        
        return output_dir


def main():
    """Train detector and generate results."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python train_detector.py <dataset_dir>")
        print("\nExample:")
        print("  python train_detector.py datasets/nicssim_labeled")
        sys.exit(1)
    
    dataset_dir = sys.argv[1]
    output_dir = "models/nicssim_detector"
    
    print(f"{'='*70}")
    print(f"NICSSIM CYBER-ATTACK DETECTOR TRAINING")
    print(f"{'='*70}")
    print(f"Dataset: {dataset_dir}")
    print(f"Output: {output_dir}")
    
    # Train model
    trainer = DetectorTrainer(dataset_dir)
    trainer.train_random_forest(n_estimators=100, max_depth=20)
    trainer.evaluate()
    results_dir = trainer.save_model(output_dir)
    
    print(f"\n{'='*70}")
    print(" TRAINING COMPLETE!")
    print(f"{'='*70}")
    print(f"\nResults saved to: {results_dir}")
    print(f"\nGenerated files:")
    print(f"  - random_forest_model.pkl    : Trained model")
    print(f"  - confusion_matrix_test.png  : Confusion matrix")
    print(f"  - feature_importance.png     : Top features")
    print(f"  - per_class_metrics.png      : Detection performance")
    print(f"  - metrics.json               : Numerical results")
    
    print(f"\n{'='*70}")
    print("READY FOR PUBLICATION!")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
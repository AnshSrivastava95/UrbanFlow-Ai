
import json
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    adjusted_rand_score
)


BASE_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = BASE_DIR / "results"

FEATURES = [
    "trip_count",
    "unique_stop_count",
    "avg_stops_per_trip",
    "avg_trip_duration_min",
    "avg_departure_hour",
    "morning_peak_share",
    "evening_peak_share"
]

K_VALUES = range(2, 11)
RANDOM_STATE = 42
SAMPLE_SIZE = 2000


def calculate_silhouette(X, labels):
    unique_labels = np.unique(labels)

    if len(unique_labels) < 2 or len(unique_labels) >= len(labels):
        return None

    rng = np.random.default_rng(RANDOM_STATE)
    selected = []

    for cluster in unique_labels:
        indices = np.where(labels == cluster)[0]
        selected.append(int(rng.choice(indices)))

    remaining = np.setdiff1d(
        np.arange(len(labels)),
        selected
    )

    additional_count = min(
        SAMPLE_SIZE - len(selected),
        len(remaining)
    )

    if additional_count > 0:
        additional = rng.choice(
            remaining,
            size=additional_count,
            replace=False
        )
        selected = np.concatenate([selected, additional])
    else:
        selected = np.array(selected)

    return float(
        silhouette_score(
            X[selected],
            labels[selected],
            metric="euclidean"
        )
    )


def evaluate_kmeans(X, experiment_name):
    results = []
    saved_labels = {}

    for k in K_VALUES:
        model = KMeans(
            n_clusters=k,
            init="k-means++",
            n_init=20,
            random_state=RANDOM_STATE
        )

        labels = model.fit_predict(X)

        cluster_sizes = np.bincount(labels)

        silhouette = calculate_silhouette(
            X,
            labels
        )

        db_index = davies_bouldin_score(
            X,
            labels
        )

        results.append({
            "experiment": experiment_name,
            "k": k,
            "silhouette": silhouette,
            "davies_bouldin": float(db_index),
            "inertia": float(model.inertia_),
            "minimum_cluster_size": int(cluster_sizes.min()),
            "maximum_cluster_size": int(cluster_sizes.max()),
            "cluster_sizes": cluster_sizes.tolist()
        })

        saved_labels[k] = labels

        print(
            f"{experiment_name} | K={k} "
            f"| Silhouette={silhouette:.4f} "
            f"| DB={db_index:.4f} "
            f"| Cluster sizes={cluster_sizes.tolist()}"
        )

    return results, saved_labels


def main():
    print("Loading original route features...")

    raw_df = pd.read_csv(
        RESULTS_DIR / "route_features.csv"
    )

    baseline_df = pd.read_csv(
        RESULTS_DIR / "route_features_standardized.csv"
    )

    raw_X = raw_df[FEATURES].copy()

    if not np.isfinite(raw_X.to_numpy(dtype=float)).all():
        raise ValueError("Raw feature matrix contains invalid values.")

    print("\n========== FEATURE SKEWNESS ==========")

    skewness = raw_X.skew()

    print(skewness.to_string())

    # Apply log1p only to positively skewed, nonnegative features.
    log_features = [
        feature
        for feature in FEATURES
        if skewness[feature] > 1.0
        and raw_X[feature].min() >= 0
    ]

    print("\nFeatures selected for log1p:")
    print(log_features)

    transformed_df = raw_X.copy()

    for feature in log_features:
        transformed_df[feature] = np.log1p(
            transformed_df[feature]
        )

    # Scale transformed features.
    scaler = StandardScaler()

    transformed_X = scaler.fit_transform(
        transformed_df
    )

    baseline_X = baseline_df[FEATURES].to_numpy(
        dtype=float
    )

    print("\n========== BASELINE EXPERIMENT ==========")

    baseline_results, baseline_labels = evaluate_kmeans(
        baseline_X,
        "StandardScaler"
    )

    print("\n========== LOG TRANSFORMATION EXPERIMENT ==========")

    transformed_results, transformed_labels = evaluate_kmeans(
        transformed_X,
        "Log1p_StandardScaler"
    )

    # Compare baseline K=5 and transformed K=5.
    baseline_k5 = baseline_labels[5]
    transformed_k5 = transformed_labels[5]

    ari = adjusted_rand_score(
        baseline_k5,
        transformed_k5
    )

    print("\n========== TRANSFORMATION STABILITY ==========")
    print(f"ARI between baseline and transformed K=5: {ari:.4f}")

    all_results = (
        baseline_results + transformed_results
    )

    results_df = pd.DataFrame(all_results)

    results_df.to_csv(
        RESULTS_DIR / "transformation_comparison.csv",
        index=False
    )

    # Save transformed feature matrix for reproducibility.
    transformed_output = pd.DataFrame(
        transformed_X,
        columns=FEATURES
    )

    transformed_output.insert(
        0,
        "route_id",
        raw_df["route_id"].values
    )

    transformed_output.to_csv(
        RESULTS_DIR / "route_features_log_scaled.csv",
        index=False
    )

    # Save route-level assignments for K=5.
    assignments = pd.DataFrame({
        "route_id": raw_df["route_id"],
        "standard_scaler_cluster": baseline_k5,
        "log_scaled_cluster": transformed_k5
    })

    assignments.to_csv(
        RESULTS_DIR / "transformation_cluster_assignments.csv",
        index=False
    )

    report = {
        "routes": int(len(raw_df)),
        "feature_skewness": {
            key: float(value)
            for key, value in skewness.items()
        },
        "log1p_features": log_features,
        "baseline_k5": next(
            item for item in baseline_results if item["k"] == 5
        ),
        "transformed_k5": next(
            item for item in transformed_results if item["k"] == 5
        ),
        "adjusted_rand_index_k5": float(ari),
        "interpretation": (
            "Log transformation is an experimental preprocessing "
            "alternative. Model selection should consider cluster "
            "quality, size balance, stability and interpretability."
        )
    }

    with open(
        RESULTS_DIR / "transformation_report.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(report, file, indent=4)

    print("\n========== TRANSFORMATION EXPERIMENT COMPLETE ==========")
    print(json.dumps(report, indent=4))

    print("\nGenerated files:")
    print("1. transformation_comparison.csv")
    print("2. route_features_log_scaled.csv")
    print("3. transformation_cluster_assignments.csv")
    print("4. transformation_report.json")


if __name__ == "__main__":
    main()

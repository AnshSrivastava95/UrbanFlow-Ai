
import json
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.cluster import KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    silhouette_score,
    davies_bouldin_score
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

K = 5
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

        selected = np.concatenate([
            np.array(selected),
            additional
        ])
    else:
        selected = np.array(selected)

    return float(
        silhouette_score(
            X[selected],
            labels[selected],
            metric="euclidean"
        )
    )


def train_and_evaluate(X, feature_names, experiment_name):
    model = KMeans(
        n_clusters=K,
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

    return {
        "experiment": experiment_name,
        "features_used": feature_names,
        "feature_count": len(feature_names),
        "silhouette": silhouette,
        "davies_bouldin": float(db_index),
        "inertia": float(model.inertia_),
        "minimum_cluster_size": int(cluster_sizes.min()),
        "maximum_cluster_size": int(cluster_sizes.max()),
        "cluster_sizes": cluster_sizes.tolist(),
        "labels": labels
    }


def main():
    print("Loading standardized route features...")

    df = pd.read_csv(
        RESULTS_DIR / "route_features_standardized.csv"
    )

    X_full = df[FEATURES].to_numpy(dtype=float)

    if not np.isfinite(X_full).all():
        raise ValueError(
            "Feature matrix contains invalid values."
        )

    print("\n========== BASELINE MODEL ==========")

    baseline = train_and_evaluate(
        X_full,
        FEATURES,
        "All seven features"
    )

    baseline_labels = baseline["labels"]

    print(
        f"Silhouette: {baseline['silhouette']:.4f}"
    )

    print(
        f"Davies-Bouldin: {baseline['davies_bouldin']:.4f}"
    )

    results = []

    results.append({
        key: value
        for key, value in baseline.items()
        if key != "labels"
    })

    print("\n========== FEATURE ABLATION ==========")

    for feature in FEATURES:

        remaining_features = [
            item for item in FEATURES
            if item != feature
        ]

        X_reduced = df[remaining_features].to_numpy(
            dtype=float
        )

        result = train_and_evaluate(
            X_reduced,
            remaining_features,
            f"Without {feature}"
        )

        ari = adjusted_rand_score(
            baseline_labels,
            result["labels"]
        )

        silhouette_change = (
            result["silhouette"] - baseline["silhouette"]
        )

        result["removed_feature"] = feature
        result["ari_vs_baseline"] = float(ari)
        result["silhouette_change"] = float(silhouette_change)

        print(f"\nRemoved feature: {feature}")
        print(
            f"Silhouette: {result['silhouette']:.4f}"
        )
        print(
            f"Davies-Bouldin: {result['davies_bouldin']:.4f}"
        )
        print(
            f"ARI vs baseline: {ari:.4f}"
        )
        print(
            f"Cluster sizes: {result['cluster_sizes']}"
        )

        results.append({
            key: value
            for key, value in result.items()
            if key != "labels"
        })

    results_df = pd.DataFrame(results)

    results_df.to_csv(
        RESULTS_DIR / "feature_ablation_results.csv",
        index=False
    )

    # Sort experiments by silhouette score.
    ranking = results_df.sort_values(
        "silhouette",
        ascending=False
    )

    print("\n========== EXPERIMENT RANKING ==========")

    print(
        ranking[
            [
                "experiment",
                "silhouette",
                "davies_bouldin",
                "minimum_cluster_size",
                "maximum_cluster_size"
            ]
        ].to_string(index=False)
    )

    report = {
        "dataset_routes": int(len(df)),
        "baseline_silhouette": float(
            baseline["silhouette"]
        ),
        "baseline_davies_bouldin": float(
            baseline["davies_bouldin"]
        ),
        "experiments": results,
        "interpretation": (
            "Feature ablation measures how removing one feature "
            "changes clustering quality and route assignments. "
            "It does not establish causal importance."
        )
    }

    with open(
        RESULTS_DIR / "feature_ablation_report.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            report,
            file,
            indent=4
        )

    print("\nFEATURE ABLATION COMPLETE")

    print("\nGenerated files:")
    print("1. feature_ablation_results.csv")
    print("2. feature_ablation_report.json")


if __name__ == "__main__":
    main()


import json
from pathlib import Path

import numpy as np
import pandas as pd

from scipy.cluster.hierarchy import linkage, cut_tree

from sklearn.cluster import KMeans
from sklearn.metrics import (
    adjusted_rand_score,
    silhouette_score,
    davies_bouldin_score
)
from sklearn.feature_selection import f_classif


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
SILHOUETTE_SAMPLE_SIZE = 2000


def calculate_silhouette(X, labels):
    unique_labels = np.unique(labels)

    if len(unique_labels) < 2 or len(unique_labels) >= len(labels):
        return None

    rng = np.random.default_rng(RANDOM_STATE)

    # Guarantee that each cluster is represented.
    selected = []

    for cluster in unique_labels:
        indices = np.where(labels == cluster)[0]
        selected.append(int(rng.choice(indices)))

    remaining = np.setdiff1d(
        np.arange(len(labels)),
        selected
    )

    sample_size = min(
        SILHOUETTE_SAMPLE_SIZE,
        len(X)
    )

    additional_count = sample_size - len(selected)

    if additional_count > 0:
        additional = rng.choice(
            remaining,
            size=min(additional_count, len(remaining)),
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


def evaluate_model(name, X, labels):
    cluster_sizes = np.bincount(labels)

    return {
        "model": name,
        "actual_clusters": int(len(np.unique(labels))),
        "silhouette": calculate_silhouette(X, labels),
        "davies_bouldin": float(
            davies_bouldin_score(X, labels)
        ),
        "minimum_cluster_size": int(cluster_sizes.min()),
        "maximum_cluster_size": int(cluster_sizes.max()),
        "cluster_sizes": cluster_sizes.tolist()
    }


def calculate_feature_importance(raw_df, labels):
    print("\n========== FEATURE IMPORTANCE ==========")

    X = raw_df[FEATURES].copy()
    y = np.asarray(labels)

    f_scores, p_values = f_classif(X, y)

    results = []

    for index, feature in enumerate(FEATURES):
        values = X[feature].to_numpy()

        overall_mean = np.mean(values)

        total_sum_squares = np.sum(
            (values - overall_mean) ** 2
        )

        between_sum_squares = 0.0

        for cluster in np.unique(y):
            cluster_values = values[y == cluster]

            between_sum_squares += (
                len(cluster_values)
                * (np.mean(cluster_values) - overall_mean) ** 2
            )

        eta_squared = (
            between_sum_squares / total_sum_squares
            if total_sum_squares > 0
            else 0.0
        )

        results.append({
            "feature": feature,
            "f_score": float(f_scores[index]),
            "p_value": float(p_values[index]),
            "eta_squared": float(eta_squared)
        })

    importance_df = pd.DataFrame(results)

    importance_df = importance_df.sort_values(
        "eta_squared",
        ascending=False
    ).reset_index(drop=True)

    importance_df.to_csv(
        RESULTS_DIR / "feature_importance.csv",
        index=False
    )

    print(importance_df.to_string(index=False))

    return importance_df


def compare_scalers(standard_X, robust_X):
    print("\n========== SCALER SENSITIVITY ==========")

    standard_model = KMeans(
        n_clusters=K,
        init="k-means++",
        n_init=20,
        random_state=RANDOM_STATE
    )

    robust_model = KMeans(
        n_clusters=K,
        init="k-means++",
        n_init=20,
        random_state=RANDOM_STATE
    )

    standard_labels = standard_model.fit_predict(
        standard_X
    )

    robust_labels = robust_model.fit_predict(
        robust_X
    )

    # Compare assignments for the same routes.
    ari = adjusted_rand_score(
        standard_labels,
        robust_labels
    )

    standard_metrics = evaluate_model(
        "KMeans StandardScaler",
        standard_X,
        standard_labels
    )

    robust_metrics = evaluate_model(
        "KMeans RobustScaler",
        robust_X,
        robust_labels
    )

    print(
        f"StandardScaler silhouette: "
        f"{standard_metrics['silhouette']:.4f}"
    )

    print(
        f"RobustScaler silhouette: "
        f"{robust_metrics['silhouette']:.4f}"
    )

    print(
        f"ARI between scaler assignments: {ari:.4f}"
    )

    return {
        "standard_model": standard_metrics,
        "robust_model": robust_metrics,
        "adjusted_rand_index": float(ari),
        "standard_labels": standard_labels,
        "robust_labels": robust_labels
    }


def compare_algorithms(standard_X):
    print("\n========== ALGORITHM COMPARISON ==========")

    kmeans = KMeans(
        n_clusters=K,
        init="k-means++",
        n_init=20,
        random_state=RANDOM_STATE
    )

    kmeans_labels = kmeans.fit_predict(
        standard_X
    )

    ward_tree = linkage(
        standard_X,
        method="ward",
        metric="euclidean",
        optimal_ordering=False
    )

    ward_labels = cut_tree(
        ward_tree,
        n_clusters=[K]
    ).reshape(-1)

    kmeans_metrics = evaluate_model(
        "KMeans K=5",
        standard_X,
        kmeans_labels
    )

    ward_metrics = evaluate_model(
        "Hierarchical Ward K=5",
        standard_X,
        ward_labels
    )

    ari = adjusted_rand_score(
        kmeans_labels,
        ward_labels
    )

    print("\nK-Means:")
    print(json.dumps(kmeans_metrics, indent=4))

    print("\nHierarchical Ward:")
    print(json.dumps(ward_metrics, indent=4))

    print(
        f"\nARI between K-Means and Ward: {ari:.4f}"
    )

    comparison = {
        "kmeans": kmeans_metrics,
        "hierarchical_ward": ward_metrics,
        "adjusted_rand_index": float(ari)
    }

    del ward_tree

    return comparison


def save_sensitivity_labels(
    raw_df,
    standard_labels,
    robust_labels
):
    output = pd.DataFrame({
        "route_id": raw_df["route_id"],
        "standard_scaler_cluster": standard_labels,
        "robust_scaler_cluster": robust_labels
    })

    output.to_csv(
        RESULTS_DIR / "scaler_cluster_comparison.csv",
        index=False
    )


def main():
    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("Loading route datasets...")

    raw_df = pd.read_csv(
        RESULTS_DIR / "route_features.csv"
    )

    standard_df = pd.read_csv(
        RESULTS_DIR / "route_features_standardized.csv"
    )

    robust_X = np.load(
        RESULTS_DIR / "route_features_robust.npy"
    )

    raw_X = raw_df[FEATURES].to_numpy(
        dtype=float
    )

    standard_X = standard_df[FEATURES].to_numpy(
        dtype=float
    )

    if not (
        len(raw_X) == len(standard_X) == len(robust_X)
    ):
        raise ValueError(
            "Raw, standard and robust datasets have different row counts."
        )

    if not (
        np.isfinite(raw_X).all()
        and np.isfinite(standard_X).all()
        and np.isfinite(robust_X).all()
    ):
        raise ValueError(
            "Invalid values detected in feature matrices."
        )

    # 1. Feature importance using the existing StandardScaler K-Means model.
    standard_model = KMeans(
        n_clusters=K,
        n_init=20,
        random_state=RANDOM_STATE
    )

    standard_labels = standard_model.fit_predict(
        standard_X
    )

    feature_importance = calculate_feature_importance(
        raw_df,
        standard_labels
    )

    # 2. Compare StandardScaler and RobustScaler.
    scaler_results = compare_scalers(
        standard_X,
        robust_X
    )

    save_sensitivity_labels(
        raw_df,
        scaler_results["standard_labels"],
        scaler_results["robust_labels"]
    )

    # 3. Compare K-Means and Hierarchical Ward.
    algorithm_results = compare_algorithms(
        standard_X
    )

    report = {
        "dataset_routes": int(len(raw_df)),
        "features": FEATURES,
        "cluster_count": K,
        "feature_importance": feature_importance.to_dict(
            orient="records"
        ),
        "scaler_sensitivity": {
            "standard_model": scaler_results["standard_model"],
            "robust_model": scaler_results["robust_model"],
            "adjusted_rand_index": scaler_results[
                "adjusted_rand_index"
            ]
        },
        "algorithm_comparison": algorithm_results,
        "interpretation": (
            "Feature importance is measured using between-cluster "
            "variance (eta-squared) and ANOVA F-statistics. "
            "These are descriptive associations, not causal effects. "
            "ARI compares cluster assignments and is independent "
            "of cluster label numbering."
        )
    }

    with open(
        RESULTS_DIR / "model_validation_report.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            report,
            file,
            indent=4
        )

    print("\n========== VALIDATION COMPLETE ==========")

    print(
        json.dumps(
            report,
            indent=4
        )
    )

    print("\nGenerated files:")
    print("1. feature_importance.csv")
    print("2. scaler_cluster_comparison.csv")
    print("3. model_validation_report.json")


if __name__ == "__main__":
    main()

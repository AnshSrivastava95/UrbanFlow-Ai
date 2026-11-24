
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from scipy.cluster.hierarchy import linkage, cut_tree
from scipy.spatial.distance import pdist

from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    adjusted_rand_score
)


warnings.filterwarnings("ignore")

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

SILHOUETTE_SAMPLE_SIZE = 2000

RANDOM_STATE = 42

FINAL_K = 5


def evaluate_clustering(X, labels, metric):
    unique_labels = np.unique(labels)

    if len(unique_labels) < 2 or len(unique_labels) >= len(labels):
        return None, None

    rng = np.random.default_rng(RANDOM_STATE)

    first_indices = []

    for cluster in unique_labels:
        indices = np.where(labels == cluster)[0]

        if len(indices) > 0:
            first_indices.append(
                rng.choice(indices)
            )

    remaining_indices = np.setdiff1d(
        np.arange(len(labels)),
        first_indices
    )

    sample_size = min(
        SILHOUETTE_SAMPLE_SIZE,
        len(X)
    )

    additional_count = sample_size - len(first_indices)

    if additional_count > 0:
        additional_indices = rng.choice(
            remaining_indices,
            size=min(
                additional_count,
                len(remaining_indices)
            ),
            replace=False
        )

        sample_indices = np.concatenate([
            np.array(first_indices),
            additional_indices
        ])
    else:
        sample_indices = np.array(first_indices)

    X_sample = X[sample_indices]
    labels_sample = labels[sample_indices]

    if len(np.unique(labels_sample)) < 2:
        return None, None

    silhouette = silhouette_score(
        X_sample,
        labels_sample,
        metric=metric
    )

    db_index = davies_bouldin_score(
        X,
        labels
    )

    return float(silhouette), float(db_index)


def run_kmeans(X):
    print("\n========== K-MEANS ==========")

    rows = []

    for k in K_VALUES:
        model = KMeans(
            n_clusters=k,
            init="k-means++",
            n_init=20,
            random_state=RANDOM_STATE
        )

        labels = model.fit_predict(X)

        silhouette, db_index = evaluate_clustering(
            X,
            labels,
            "euclidean"
        )

        cluster_sizes = np.bincount(labels)

        rows.append({
            "algorithm": "KMeans",
            "metric": "euclidean",
            "linkage": "not_applicable",
            "k": k,
            "actual_clusters": len(np.unique(labels)),
            "minimum_cluster_size": int(cluster_sizes.min()),
            "maximum_cluster_size": int(cluster_sizes.max()),
            "silhouette": silhouette,
            "davies_bouldin": db_index,
            "inertia": float(model.inertia_)
        })

        print(
            f"K={k} | Silhouette={silhouette:.4f} "
            f"| DB={db_index:.4f} "
            f"| Inertia={model.inertia_:.2f}"
        )

    return rows


def run_hierarchical(X):
    print("\n========== HIERARCHICAL CLUSTERING ==========")

    rows = []

    configurations = [
        ("euclidean", "ward"),
        ("euclidean", "complete"),
        ("euclidean", "average"),
        ("cityblock", "complete"),
        ("cityblock", "average")
    ]

    for metric, method in configurations:

        print(
            f"\nProcessing {method} linkage "
            f"with {metric} distance..."
        )

        distances = pdist(
            X,
            metric=metric
        )

        tree = linkage(
            distances,
            method=method,
            optimal_ordering=False
        )

        del distances

        for k in K_VALUES:

            labels = cut_tree(
                tree,
                n_clusters=[k]
            ).reshape(-1)

            cluster_sizes = np.bincount(labels)

            actual_clusters = len(
                np.unique(labels)
            )

            print(
                f"Requested K={k} | "
                f"Actual clusters={actual_clusters} | "
                f"Cluster sizes={cluster_sizes.tolist()}"
            )

            silhouette, db_index = evaluate_clustering(
                X,
                labels,
                metric
            )

            rows.append({
                "algorithm": "Hierarchical",
                "metric": metric,
                "linkage": method,
                "k": k,
                "actual_clusters": actual_clusters,
                "minimum_cluster_size": int(cluster_sizes.min()),
                "maximum_cluster_size": int(cluster_sizes.max()),
                "silhouette": silhouette,
                "davies_bouldin": db_index,
                "inertia": None
            })

            if silhouette is None:
                print(
                    f"K={k} | Silhouette unavailable "
                    f"| DB={db_index}"
                )
            else:
                print(
                    f"K={k} | Silhouette={silhouette:.4f} "
                    f"| DB={db_index:.4f}"
                )

        del tree

    return rows


def evaluate_kmeans_stability(
    X,
    k=FINAL_K,
    seeds=(21, 42, 63, 84, 105)
):
    print("\n========== K-MEANS STABILITY ==========")

    stability_rows = []

    reference_model = KMeans(
        n_clusters=k,
        n_init=20,
        random_state=RANDOM_STATE
    )

    reference_labels = reference_model.fit_predict(X)

    for seed in seeds:

        model = KMeans(
            n_clusters=k,
            n_init=20,
            random_state=seed
        )

        labels = model.fit_predict(X)

        ari = adjusted_rand_score(
            reference_labels,
            labels
        )

        stability_rows.append({
            "seed": seed,
            "k": k,
            "adjusted_rand_index": float(ari)
        })

        print(
            f"Seed={seed} | ARI={ari:.4f}"
        )

    return stability_rows


def create_pca_plot(X, labels):
    print("\nGenerating PCA visualization...")

    pca = PCA(
        n_components=2
    )

    transformed = pca.fit_transform(X)

    plt.figure(figsize=(10, 7))

    scatter = plt.scatter(
        transformed[:, 0],
        transformed[:, 1],
        c=labels,
        cmap="viridis",
        s=12,
        alpha=0.65
    )

    plt.xlabel("Principal Component 1")
    plt.ylabel("Principal Component 2")

    plt.title(
        "UrbanFlow AI - Route Behaviour Clusters (PCA)"
    )

    plt.colorbar(
        scatter,
        label="Cluster"
    )

    plt.tight_layout()

    plt.savefig(
        RESULTS_DIR / "pca_clusters.png",
        dpi=300
    )

    plt.close()

    return {
        "explained_variance_ratio": [
            float(value)
            for value in pca.explained_variance_ratio_
        ],
        "total_explained_variance": float(
            sum(pca.explained_variance_ratio_)
        )
    }


def save_cluster_profiles(raw_feature_df, labels):
    print("\nGenerating cluster profiles in original units...")

    profile_df = raw_feature_df[FEATURES].copy()

    profile_df["cluster"] = labels

    grouped = profile_df.groupby("cluster")

    summary = grouped[FEATURES].agg(
        ["mean", "median", "std"]
    )

    summary.insert(
        0,
        ("cluster_size", "count"),
        grouped.size()
    )

    summary.to_csv(
        RESULTS_DIR / "cluster_profiles.csv"
    )

    return summary


def main():
    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("Loading standardized route features...")

    standardized_df = pd.read_csv(
        RESULTS_DIR / "route_features_standardized.csv"
    )

    raw_feature_df = pd.read_csv(
        RESULTS_DIR / "route_features.csv"
    )

    X = standardized_df[FEATURES].to_numpy(
        dtype=float
    )

    if len(X) != len(raw_feature_df):
        raise ValueError(
            "Raw and standardized datasets have different row counts."
        )

    if not np.isfinite(X).all():
        raise ValueError(
            "Standardized feature matrix contains invalid values."
        )

    all_results = []

    kmeans_results = run_kmeans(X)

    all_results.extend(
        kmeans_results
    )

    hierarchical_results = run_hierarchical(X)

    all_results.extend(
        hierarchical_results
    )

    results_df = pd.DataFrame(
        all_results
    )

    results_df.to_csv(
        RESULTS_DIR / "clustering_comparison.csv",
        index=False
    )

    valid_results = results_df.dropna(
        subset=["silhouette"]
    )

    best_result = valid_results.loc[
        valid_results["silhouette"].idxmax()
    ]

    print(
        "\n========== BEST SILHOUETTE RESULT =========="
    )

    print(
        best_result.to_string()
    )

    # Final provisional K-Means model.
    final_model = KMeans(
        n_clusters=FINAL_K,
        init="k-means++",
        n_init=20,
        random_state=RANDOM_STATE
    )

    final_labels = final_model.fit_predict(X)

    output_df = raw_feature_df.copy()

    output_df["cluster"] = final_labels

    output_df.to_csv(
        RESULTS_DIR / "kmeans_route_clusters.csv",
        index=False
    )

    stability = evaluate_kmeans_stability(
        X,
        k=FINAL_K
    )

    pca_report = create_pca_plot(
        X,
        final_labels
    )

    profiles = save_cluster_profiles(
        raw_feature_df,
        final_labels
    )

    print(
        "\n========== CLUSTER PROFILES =========="
    )

    print(profiles.to_string())

    report = {
        "routes": int(len(X)),
        "features": FEATURES,
        "tested_k_values": list(K_VALUES),
        "silhouette_sample_size": min(
            SILHOUETTE_SAMPLE_SIZE,
            len(X)
        ),
        "best_silhouette_configuration": {
            key: (
                None if pd.isna(value)
                else float(value)
                if isinstance(value, (np.floating, float))
                else value
            )
            for key, value in best_result.to_dict().items()
        },
        "provisional_kmeans_k": FINAL_K,
        "kmeans_stability": stability,
        "pca": pca_report,
        "outputs": [
            "clustering_comparison.csv",
            "kmeans_route_clusters.csv",
            "cluster_profiles.csv",
            "pca_clusters.png"
        ],
        "interpretation_note": (
            "Clusters represent scheduled route-service behaviour, "
            "not directly observed traffic congestion."
        )
    }

    with open(
        RESULTS_DIR / "clustering_report.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            report,
            file,
            indent=4
        )

    print(
        "\nCLUSTERING EXPERIMENTS COMPLETE"
    )

    print(
        json.dumps(
            report,
            indent=4
        )
    )


if __name__ == "__main__":
    main()

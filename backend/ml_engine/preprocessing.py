
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, RobustScaler
from scipy.spatial.distance import pdist


BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_FILE = BASE_DIR / "results" / "route_features.csv"
OUTPUT_DIR = BASE_DIR / "results"

FEATURES = [
    "trip_count",
    "unique_stop_count",
    "avg_stops_per_trip",
    "avg_trip_duration_min",
    "avg_departure_hour",
    "morning_peak_share",
    "evening_peak_share",
]


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading route features...")
    df = pd.read_csv(INPUT_FILE)

    X = df[FEATURES].copy()

    print("Checking and cleaning feature values...")
    X = X.replace([np.inf, -np.inf], np.nan)

    missing_before = X.isna().sum().to_dict()

    for column in FEATURES:
        X[column] = X[column].fillna(X[column].median())

    print("Applying StandardScaler...")
    standard_scaler = StandardScaler()
    X_standard = standard_scaler.fit_transform(X)

    print("Applying RobustScaler for comparison...")
    robust_scaler = RobustScaler()
    X_robust = robust_scaler.fit_transform(X)

    print("Comparing distance metrics on standardized features...")

    sample_size = min(1000, len(X_standard))
    rng = np.random.default_rng(42)
    sample_indices = rng.choice(
        len(X_standard),
        size=sample_size,
        replace=False
    )

    sample = X_standard[sample_indices]

    euclidean = pdist(sample, metric="euclidean")
    manhattan = pdist(sample, metric="cityblock")

    correlation = np.corrcoef(euclidean, manhattan)[0, 1]

    np.save(
        OUTPUT_DIR / "route_features_standardized.npy",
        X_standard
    )

    np.save(
        OUTPUT_DIR / "route_features_robust.npy",
        X_robust
    )

    pd.DataFrame(
        X_standard,
        columns=FEATURES
    ).assign(route_id=df["route_id"].values).to_csv(
        OUTPUT_DIR / "route_features_standardized.csv",
        index=False
    )

    report = {
        "routes": int(len(df)),
        "features": FEATURES,
        "missing_values_before_imputation": {
            key: int(value)
            for key, value in missing_before.items()
        },
        "standard_scaler_mean": {
            key: float(value)
            for key, value in zip(FEATURES, standard_scaler.mean_)
        },
        "standard_scaler_scale": {
            key: float(value)
            for key, value in zip(FEATURES, standard_scaler.scale_)
        },
        "distance_comparison": {
            "sample_size": int(sample_size),
            "euclidean_mean": float(np.mean(euclidean)),
            "manhattan_mean": float(np.mean(manhattan)),
            "euclidean_median": float(np.median(euclidean)),
            "manhattan_median": float(np.median(manhattan)),
            "distance_correlation": float(correlation)
        },
        "outputs": [
            "route_features_standardized.npy",
            "route_features_robust.npy",
            "route_features_standardized.csv"
        ]
    }

    with open(
        OUTPUT_DIR / "preprocessing_report.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(report, file, indent=4)

    print("\nPREPROCESSING COMPLETE")
    print(json.dumps(report, indent=4))


if __name__ == "__main__":
    main()

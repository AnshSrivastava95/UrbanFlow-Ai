
import csv
import json
import math
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "results" / "route_features.csv"
OUTPUT = ROOT / "results" / "feature_validation.json"

NUMERIC_FEATURES = [
    "trip_count",
    "unique_stop_count",
    "avg_stops_per_trip",
    "avg_trip_duration_min",
    "avg_departure_hour",
    "morning_peak_share",
    "evening_peak_share",
]


def percentile(values, p):
    if not values:
        return None

    values = sorted(values)
    position = (len(values) - 1) * p
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    fraction = position - lower

    return values[lower] * (1 - fraction) + values[upper] * fraction


def inspect_features():
    if not INPUT.exists():
        raise FileNotFoundError(INPUT)

    values = {name: [] for name in NUMERIC_FEATURES}
    missing = Counter()
    invalid = Counter()
    route_ids = set()
    route_types = Counter()
    row_count = 0

    with INPUT.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            row_count += 1

            route_id = row.get("route_id", "")
            if not route_id:
                missing["route_id"] += 1
            elif route_id in route_ids:
                invalid["duplicate_route_id"] += 1
            else:
                route_ids.add(route_id)

            route_types[row.get("route_type", "unknown")] += 1

            for feature in NUMERIC_FEATURES:
                raw = row.get(feature, "")

                if raw is None or raw.strip() == "":
                    missing[feature] += 1
                    continue

                try:
                    value = float(raw)

                    if not math.isfinite(value):
                        invalid[feature] += 1
                    else:
                        values[feature].append(value)

                except ValueError:
                    invalid[feature] += 1

    feature_report = {}

    for feature, data in values.items():
        if not data:
            feature_report[feature] = {
                "valid_values": 0,
                "constant": None,
            }
            continue

        q1 = percentile(data, 0.25)
        q3 = percentile(data, 0.75)
        iqr = q3 - q1

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        outliers = sum(
            value < lower or value > upper
            for value in data
        )

        feature_report[feature] = {
            "valid_values": len(data),
            "missing_values": missing[feature],
            "invalid_values": invalid[feature],
            "minimum": min(data),
            "maximum": max(data),
            "mean": sum(data) / len(data),
            "median": percentile(data, 0.50),
            "q1": q1,
            "q3": q3,
            "constant": min(data) == max(data),
            "iqr_outlier_count": outliers,
        }

    report = {
        "total_rows": row_count,
        "unique_route_ids": len(route_ids),
        "duplicate_route_ids": invalid["duplicate_route_id"],
        "route_type_distribution": dict(route_types),
        "features": feature_report,
        "duration_checks": {
            "zero_duration_routes": sum(
                value == 0
                for value in values["avg_trip_duration_min"]
            ),
            "negative_duration_routes": sum(
                value < 0
                for value in values["avg_trip_duration_min"]
            ),
        },
        "departure_hour_checks": {
            "below_zero": sum(
                value < 0 for value in values["avg_departure_hour"]
            ),
            "above_30": sum(
                value > 30 for value in values["avg_departure_hour"]
            ),
        },
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=4)

    print("\nURBANFLOW FEATURE VALIDATION")
    print("Routes:", row_count)
    print("Unique route IDs:", len(route_ids))
    print("Duplicate route IDs:", invalid["duplicate_route_id"])

    for feature, stats in feature_report.items():
        print(f"\n{feature}")
        print("  Min:", stats.get("minimum"))
        print("  Max:", stats.get("maximum"))
        print("  Mean:", stats.get("mean"))
        print("  Missing:", missing[feature])
        print("  Invalid:", invalid[feature])
        print("  Constant:", stats.get("constant"))
        print("  IQR outliers:", stats.get("iqr_outlier_count"))

    print("\nDuration checks:", report["duration_checks"])
    print("Departure checks:", report["departure_hour_checks"])
    print("\nReport saved:", OUTPUT)


if __name__ == "__main__":
    inspect_features()

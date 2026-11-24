
import os
import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sklearn.decomposition import PCA


BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
GTFS_DIR = BASE_DIR / "data" / "raw" / "bmtc_gtfs"

FEATURES = [
    "trip_count",
    "unique_stop_count",
    "avg_stops_per_trip",
    "avg_trip_duration_min",
    "avg_departure_hour",
    "morning_peak_share",
    "evening_peak_share",
]

CLUSTER_NAMES = {
    0: "Moderate-stop, shorter scheduled routes",
    1: "Morning-focused, low-frequency routes",
    2: "Evening-focused, low-frequency routes",
    3: "Longer scheduled routes",
    4: "Very high-frequency routes",
}

CLUSTER_COLORS = {
    0: "#D6A64D",
    1: "#7695A9",
    2: "#BB8150",
    3: "#77977C",
    4: "#B59BCB",
}


app = FastAPI(
    title="UrbanFlow AI API",
    description="Urban bus route behaviour analytics platform",
    version="2.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_origin = os.getenv("FRONTEND_ORIGIN")

if frontend_origin:
    origins.extend(
        origin.strip()
        for origin in frontend_origin.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATA LOADING
# --------------------------------------------------

def load_json(filename):
    path = RESULTS_DIR / filename

    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_data():
    required_files = [
        "route_features.csv",
        "kmeans_route_clusters.csv",
        "route_features_standardized.csv",
        "cluster_profiles.csv",
    ]

    missing = [
        name for name in required_files
        if not (RESULTS_DIR / name).exists()
    ]

    if missing:
        raise RuntimeError(
            f"Missing model result files: {missing}"
        )

    routes = pd.read_csv(
        RESULTS_DIR / "kmeans_route_clusters.csv"
    )

    standardized = pd.read_csv(
        RESULTS_DIR / "route_features_standardized.csv"
    )

    raw_features = pd.read_csv(
        RESULTS_DIR / "route_features.csv"
    )

    if len(routes) != len(standardized):
        raise RuntimeError(
            "Route and standardized datasets have different row counts."
        )

    if not routes["route_id"].equals(standardized["route_id"]):
        raise RuntimeError(
            "Route order mismatch between clustering and standardized data."
        )

    if not all(feature in standardized.columns for feature in FEATURES):
        raise RuntimeError(
            "One or more required standardized features are missing."
        )

    if not np.isfinite(
        standardized[FEATURES].to_numpy(dtype=float)
    ).all():
        raise RuntimeError(
            "Standardized data contains invalid numerical values."
        )

    # PCA is fitted on the same seven standardized features.
    pca = PCA(n_components=2)

    coordinates = pca.fit_transform(
        standardized[FEATURES].to_numpy(dtype=float)
    )

    routes = routes.copy()

    routes["cluster"] = routes["cluster"].astype(int)
    routes["pca_1"] = coordinates[:, 0]
    routes["pca_2"] = coordinates[:, 1]

    profiles = pd.read_csv(
        RESULTS_DIR / "cluster_profiles.csv",
        header=[0, 1],
        index_col=0,
    )

    return {
        "routes": routes,
        "raw_features": raw_features,
        "profiles": profiles,
        "pca_variance": [
            float(value)
            for value in pca.explained_variance_ratio_
        ],
    }


DATA = None
DATA_ERROR = None

try:
    DATA = load_data()
except Exception as error:
    DATA_ERROR = str(error)
    print(f"UrbanFlow data loading error: {error}")


def require_data():
    if DATA is None:
        raise HTTPException(
            status_code=503,
            detail=f"Model data unavailable: {DATA_ERROR}",
        )

    return DATA


# --------------------------------------------------
# ROUTE HELPERS
# --------------------------------------------------

def cluster_details(cluster_id, routes):
    subset = routes[routes["cluster"] == cluster_id]

    return {
        "cluster": int(cluster_id),
        "name": CLUSTER_NAMES.get(
            cluster_id, f"Cluster {cluster_id}"
        ),
        "color": CLUSTER_COLORS.get(cluster_id, "#D6A64D"),
        "route_count": int(len(subset)),
        "percentage": round(
            len(subset) / len(routes) * 100, 2
        ) if len(routes) else 0,
    }


def records_to_json(frame):
    return json.loads(
        frame.to_json(
            orient="records",
            force_ascii=False,
        )
    )


# --------------------------------------------------
# BASIC ENDPOINTS
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "UrbanFlow AI",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "UrbanFlow AI API",
        "model_loaded": DATA is not None,
        "model": "K-Means",
        "clusters": 5,
        "features": len(FEATURES),
    }


# --------------------------------------------------
# DASHBOARD SUMMARY
# --------------------------------------------------

@app.get("/api/traffic/summary")
def traffic_summary():
    data = require_data()
    routes = data["routes"]

    clusters = [
        cluster_details(cluster_id, routes)
        for cluster_id in sorted(routes["cluster"].unique())
    ]

    return {
        "city": "Bengaluru",
        "data_source": "BMTC GTFS scheduled-service data",
        "is_demo": False,
        "analysis_type": "Scheduled bus route behaviour",
        "total_routes": int(len(routes)),
        "behaviour_clusters": int(routes["cluster"].nunique()),
        "model": "K-Means",
        "k": 5,
        "features_count": len(FEATURES),
        "clusters": clusters,
        "pca_explained_variance": round(
            sum(data["pca_variance"]), 4
        ),
    }


# --------------------------------------------------
# CLUSTER PROFILES
# --------------------------------------------------

@app.get("/api/clusters")
def get_clusters():
    data = require_data()

    routes = data["routes"]
    profiles = data["profiles"]

    results = []

    for cluster_id in sorted(routes["cluster"].unique()):
        summary = cluster_details(cluster_id, routes)

        profile = {}

        if cluster_id in profiles.index:
            row = profiles.loc[cluster_id]

            for feature in FEATURES:
                profile[feature] = {
                    statistic: (
                        float(row[(feature, statistic)])
                        if pd.notna(row[(feature, statistic)])
                        else None
                    )
                    for statistic in ["mean", "median", "std"]
                }

        summary["profile"] = profile
        results.append(summary)

    return {"clusters": results}


# --------------------------------------------------
# ROUTE EXPLORER
# --------------------------------------------------

@app.get("/api/routes")
def get_routes(
    search: str = Query(default="", max_length=150),
    cluster: int | None = Query(default=None, ge=0, le=4),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    sort_by: str = Query(default="trip_count"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
):
    data = require_data()
    routes = data["routes"].copy()

    allowed_sort = [
        "trip_count",
        "unique_stop_count",
        "avg_trip_duration_min",
        "avg_departure_hour",
        "avg_stops_per_trip",
    ]

    if sort_by not in allowed_sort:
        raise HTTPException(
            status_code=400,
            detail="Invalid sorting field.",
        )

    if cluster is not None:
        routes = routes[
            routes["cluster"] == cluster
        ]

    if search:
        mask = (
            routes["route_short_name"].fillna("").astype(str)
            .str.contains(search, case=False, regex=False)
            |
            routes["route_long_name"].fillna("").astype(str)
            .str.contains(search, case=False, regex=False)
            |
            routes["route_id"].fillna("").astype(str)
            .str.contains(search, case=False, regex=False)
        )

        routes = routes[mask]

    routes = routes.sort_values(
        sort_by,
        ascending=(order == "asc"),
    )

    total = len(routes)

    start = (page - 1) * page_size

    result = routes.iloc[
        start:start + page_size
    ]

    columns = [
        "route_id",
        "route_short_name",
        "route_long_name",
        "route_type",
        "trip_count",
        "unique_stop_count",
        "avg_stops_per_trip",
        "avg_trip_duration_min",
        "avg_departure_hour",
        "morning_peak_share",
        "evening_peak_share",
        "cluster",
    ]

    return {
        "total": int(total),
        "page": page,
        "page_size": page_size,
        "total_pages": int(np.ceil(total / page_size)),
        "routes": records_to_json(result[columns]),
    }




# --------------------------------------------------
# STATIC GTFS SCHEDULE DATA
# --------------------------------------------------

_GTFS_CACHE = None
_GTFS_ERROR = None


def load_gtfs_tables():
    """Load the static BMTC GTFS tables once, when first requested."""
    global _GTFS_CACHE, _GTFS_ERROR

    if _GTFS_CACHE is not None:
        return _GTFS_CACHE

    required = ["routes.txt", "trips.txt", "stop_times.txt", "stops.txt"]
    missing = [name for name in required if not (GTFS_DIR / name).exists()]
    if missing:
        _GTFS_ERROR = (
            f"GTFS files not found in {GTFS_DIR}. Missing: {', '.join(missing)}"
        )
        raise HTTPException(status_code=503, detail=_GTFS_ERROR)

    try:
        tables = {
            name[:-4]: pd.read_csv(
                GTFS_DIR / name,
                dtype=str,
                keep_default_na=False,
                low_memory=False,
            )
            for name in required
        }

        calendar_path = GTFS_DIR / "calendar.txt"
        calendar_dates_path = GTFS_DIR / "calendar_dates.txt"
        tables["calendar"] = (
            pd.read_csv(calendar_path, dtype=str, keep_default_na=False)
            if calendar_path.exists() else pd.DataFrame()
        )
        tables["calendar_dates"] = (
            pd.read_csv(calendar_dates_path, dtype=str, keep_default_na=False)
            if calendar_dates_path.exists() else pd.DataFrame()
        )

        # Normalize identifiers to strings and verify essential GTFS columns.
        expected = {
            "routes": ["route_id"],
            "trips": ["route_id", "service_id", "trip_id"],
            "stop_times": ["trip_id", "stop_id", "stop_sequence", "departure_time"],
            "stops": ["stop_id", "stop_name"],
        }
        for table_name, columns in expected.items():
            absent = [col for col in columns if col not in tables[table_name].columns]
            if absent:
                raise ValueError(f"{table_name}.txt is missing columns: {absent}")

        _GTFS_CACHE = tables
        return _GTFS_CACHE
    except HTTPException:
        raise
    except Exception as exc:
        _GTFS_ERROR = str(exc)
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read the BMTC GTFS schedule files: {_GTFS_ERROR}",
        )


def gtfs_time_to_seconds(value):
    """GTFS times may exceed 24:00:00 for trips continuing past midnight."""
    try:
        parts = str(value).strip().split(":")
        if len(parts) != 3:
            return None
        hours, minutes, seconds = (int(part) for part in parts)
        if hours < 0 or not (0 <= minutes < 60) or not (0 <= seconds < 60):
            return None
        return hours * 3600 + minutes * 60 + seconds
    except (TypeError, ValueError):
        return None


def seconds_to_gtfs_time(seconds):
    if seconds is None:
        return None
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def active_service_ids(tables, service_date):
    """Apply GTFS calendar rules and calendar_dates exceptions."""
    date_text = service_date.strftime("%Y%m%d")
    weekday = service_date.strftime("%A").lower()
    active = set()

    calendar = tables["calendar"]
    if not calendar.empty:
        required = ["service_id", "start_date", "end_date", weekday]
        if all(column in calendar.columns for column in required):
            for row in calendar.itertuples(index=False):
                item = row._asdict()
                if (
                    item["start_date"] <= date_text <= item["end_date"]
                    and item[weekday] == "1"
                ):
                    active.add(item["service_id"])

    exceptions = tables["calendar_dates"]
    if not exceptions.empty and {
        "service_id", "date", "exception_type"
    }.issubset(exceptions.columns):
        for row in exceptions[
            exceptions["date"] == date_text
        ].itertuples(index=False):
            item = row._asdict()
            if item["exception_type"] == "1":
                active.add(item["service_id"])
            elif item["exception_type"] == "2":
                active.discard(item["service_id"])

    return active


def route_gtfs_stops(tables, route_id):
    trips = tables["trips"]
    route_trips = trips[trips["route_id"] == str(route_id)]
    if route_trips.empty:
        return []

    stop_times = tables["stop_times"]
    stop_rows = stop_times[
        stop_times["trip_id"].isin(route_trips["trip_id"])
    ][["stop_id", "stop_sequence"]].copy()

    if stop_rows.empty:
        return []

    stop_rows["stop_sequence"] = pd.to_numeric(
        stop_rows["stop_sequence"], errors="coerce"
    )
    ordered_ids = (
        stop_rows.sort_values("stop_sequence")["stop_id"]
        .drop_duplicates()
        .tolist()
    )

    stops = tables["stops"].set_index("stop_id", drop=False)
    result = []
    for stop_id in ordered_ids:
        if stop_id in stops.index:
            row = stops.loc[stop_id]
            if isinstance(row, pd.DataFrame):
                row = row.iloc[0]
            result.append({
                "stop_id": str(stop_id),
                "stop_name": str(row.get("stop_name", "")),
                "stop_code": str(row.get("stop_code", "")) or None,
                "stop_lat": (
                    float(row["stop_lat"])
                    if row.get("stop_lat") not in (None, "")
                    else None
                ),
                "stop_lon": (
                    float(row["stop_lon"])
                    if row.get("stop_lon") not in (None, "")
                    else None
                ),
            })
    return result


def route_schedule_payload(route_id, service_date, stop_id=None):
    tables = load_gtfs_tables()
    route_id = str(route_id)

    route_rows = tables["routes"][tables["routes"]["route_id"] == route_id]
    if route_rows.empty:
        raise HTTPException(status_code=404, detail="Route not found in GTFS feed.")

    trips = tables["trips"]
    route_trips = trips[trips["route_id"] == route_id].copy()
    if route_trips.empty:
        raise HTTPException(status_code=404, detail="No trips found for this route.")

    stops = route_gtfs_stops(tables, route_id)
    route_row = route_rows.iloc[0]
    route_info = {
        "route_id": route_id,
        "route_short_name": route_row.get("route_short_name", ""),
        "route_long_name": route_row.get("route_long_name", ""),
        "route_type": route_row.get("route_type", ""),
    }

    active_ids = active_service_ids(tables, service_date)
    active_trips = route_trips[route_trips["service_id"].isin(active_ids)]
    result = {
        "route": route_info,
        "service_date": service_date.isoformat(),
        "total_route_trips_in_feed": int(len(route_trips)),
        "active_trips_on_date": int(len(active_trips)),
        "stops": stops,
        "selected_stop_id": stop_id,
        "departures": [],
        "frequency": [],
        "headway_summary": None,
        "schedule_note": (
            "Times are scheduled GTFS departures, not live vehicle arrival predictions."
        ),
    }

    if not stop_id:
        return result

    valid_stop_ids = {item["stop_id"] for item in stops}
    if str(stop_id) not in valid_stop_ids:
        raise HTTPException(
            status_code=404,
            detail="The selected stop is not served by this route.",
        )

    stop_times = tables["stop_times"]
    selected = stop_times[
        stop_times["trip_id"].isin(active_trips["trip_id"])
        & (stop_times["stop_id"] == str(stop_id))
    ].copy()

    selected["departure_seconds"] = selected["departure_time"].map(
        gtfs_time_to_seconds
    )
    selected = selected.dropna(subset=["departure_seconds"])
    selected = selected.sort_values("departure_seconds")

    seconds = selected["departure_seconds"].astype(int).tolist()
    departures = []
    for index, row in enumerate(selected.itertuples(index=False)):
        departure_seconds = int(row.departure_seconds)
        gap = (
            round((departure_seconds - seconds[index - 1]) / 60, 1)
            if index > 0 else None
        )
        departures.append({
            "trip_id": str(row.trip_id),
            "departure_time": seconds_to_gtfs_time(departure_seconds),
            "headway_minutes_from_previous": gap,
        })

    result["departures"] = departures

    # Count scheduled departures in local clock-hour buckets.
    hourly = {}
    for departure in departures:
        hour = int(departure["departure_time"].split(":")[0]) % 24
        label = f"{hour:02d}:00"
        hourly[label] = hourly.get(label, 0) + 1
    result["frequency"] = [
        {"hour": hour, "departure_count": hourly[hour]}
        for hour in sorted(hourly)
    ]

    gaps = [
        departure["headway_minutes_from_previous"]
        for departure in departures
        if departure["headway_minutes_from_previous"] is not None
    ]
    if gaps:
        result["headway_summary"] = {
            "departure_count": len(departures),
            "average_minutes": round(float(np.mean(gaps)), 1),
            "median_minutes": round(float(np.median(gaps)), 1),
            "minimum_minutes": round(float(np.min(gaps)), 1),
            "maximum_minutes": round(float(np.max(gaps)), 1),
        }

    return result


# --------------------------------------------------
# ROUTE SCHEDULE / PASSENGER DEPARTURES
# --------------------------------------------------

@app.get("/api/routes/{route_id}/schedule")
def get_route_schedule(
    route_id: str,
    service_date: str = Query(..., alias="date", description="Service date in YYYY-MM-DD format"),
    stop_id: str | None = Query(default=None),
):
    try:
        parsed_date = datetime.strptime(service_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date. Use YYYY-MM-DD.",
        )

    return route_schedule_payload(route_id, parsed_date, stop_id)


# --------------------------------------------------
# PCA ANALYTICS
# --------------------------------------------------

@app.get("/api/analytics/pca")
def get_pca(
    limit: int = Query(default=5063, ge=100, le=5063),
):
    data = require_data()
    routes = data["routes"]

    # Return all points by default. Sampling is optional.
    points = routes

    if limit < len(routes):
        points = routes.sample(
            n=limit,
            random_state=42,
        )

    columns = [
        "route_id",
        "route_short_name",
        "cluster",
        "pca_1",
        "pca_2",
    ]

    return {
        "explained_variance_ratio": data["pca_variance"],
        "total_explained_variance": sum(
            data["pca_variance"]
        ),
        "points": records_to_json(points[columns]),
    }


# --------------------------------------------------
# FEATURE ANALYTICS
# --------------------------------------------------

@app.get("/api/analytics/features")
def get_features():
    report = load_json("model_validation_report.json")

    return {
        "features": FEATURES,
        "feature_importance": report.get(
            "feature_importance", []
        ),
        "interpretation": (
            "Feature importance is based on ANOVA F-statistics "
            "and eta-squared between the generated clusters. "
            "These are descriptive associations, not causal effects."
        ),
    }


# --------------------------------------------------
# MODEL VALIDATION
# --------------------------------------------------

@app.get("/api/analytics/validation")
def get_validation():
    report = load_json("model_validation_report.json")
    clustering = load_json("clustering_report.json")

    if not report:
        raise HTTPException(
            status_code=503,
            detail="Model validation report unavailable.",
        )

    standard = report.get(
        "scaler_sensitivity", {}
    ).get("standard_model", {})

    return {
        "model": "K-Means with StandardScaler",
        "cluster_count": 5,
        "silhouette": standard.get("silhouette"),
        "davies_bouldin": standard.get("davies_bouldin"),
        "cluster_sizes": standard.get("cluster_sizes", []),
        "stability": clustering.get("kmeans_stability", []),
        "pca": clustering.get("pca", {}),
        "interpretation": (
            "Silhouette was estimated using a cluster-aware sample. "
            "Davies-Bouldin was calculated on the full dataset."
        ),
    }


# --------------------------------------------------
# DATASET INFORMATION
# --------------------------------------------------

@app.get("/api/analytics/dataset")
def get_dataset_info():
    inspection = load_json("dataset_inspection.json")
    validation = load_json("feature_validation.json")
    preprocessing = load_json("preprocessing_report.json")
    gtfs = load_json("gtfs_validation.json")

    return {
        "dataset": inspection,
        "feature_validation": validation,
        "preprocessing": preprocessing,
        "gtfs_validation": gtfs,
        "features": FEATURES,
        "routes": len(require_data()["routes"]),
        "source_note": (
            "Static GTFS data describes scheduled transit service. "
            "It does not establish real-time vehicle movement, "
            "observed congestion or actual travel speeds."
        ),
    }

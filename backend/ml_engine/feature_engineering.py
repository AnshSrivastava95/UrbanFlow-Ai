
import csv
import json
from collections import defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "raw" / "bmtc_gtfs"
RESULTS = ROOT / "results"


def time_to_seconds(value):
    """Convert GTFS HH:MM:SS to seconds, allowing hours above 24."""
    try:
        hours, minutes, seconds = map(int, value.split(":"))

        if hours < 0 or not (0 <= minutes < 60) or not (0 <= seconds < 60):
            return None

        return hours * 3600 + minutes * 60 + seconds
    except (ValueError, AttributeError):
        return None


def load_routes():
    routes = {}

    with (DATA / "routes.txt").open(
        encoding="utf-8-sig", newline=""
    ) as file:
        for row in csv.DictReader(file):
            route_id = row["route_id"]

            routes[route_id] = {
                "route_id": route_id,
                "route_short_name": row.get("route_short_name", ""),
                "route_long_name": row.get("route_long_name", ""),
                "route_type": row.get("route_type", ""),
            }

    return routes


def load_trips():
    trips = {}

    with (DATA / "trips.txt").open(
        encoding="utf-8-sig", newline=""
    ) as file:
        for row in csv.DictReader(file):
            trip_id = row["trip_id"]

            trips[trip_id] = {
                "route_id": row["route_id"],
                "departure": None,
                "arrival": None,
                "stop_count": 0,
                "departure_hour": None,
            }

    return trips


def process_stop_times(trips, route_stop_sets):
    print("Processing stop_times.txt...", flush=True)

    with (DATA / "stop_times.txt").open(
        encoding="utf-8-sig", newline=""
    ) as file:
        reader = csv.DictReader(file)

        for index, row in enumerate(reader, start=1):
            trip_id = row["trip_id"]
            stop_id = row["stop_id"]

            trip = trips.get(trip_id)

            if trip is None:
                continue

            arrival = time_to_seconds(row.get("arrival_time", ""))
            departure = time_to_seconds(row.get("departure_time", ""))

            trip["stop_count"] += 1

            route_stop_sets[trip["route_id"]].add(stop_id)

            if departure is not None:
                if trip["departure"] is None or departure < trip["departure"]:
                    trip["departure"] = departure

            if arrival is not None:
                if trip["arrival"] is None or arrival > trip["arrival"]:
                    trip["arrival"] = arrival

            if index % 500000 == 0:
                print(f"  Processed {index:,} stop-time records", flush=True)


def build_route_features(routes, trips, route_stop_sets):
    route_trips = defaultdict(list)

    for trip_id, trip in trips.items():
        route_trips[trip["route_id"]].append(trip)

    rows = []

    for route_id, route in routes.items():
        route_trip_list = route_trips.get(route_id, [])

        valid_durations = []
        departure_hours = []
        morning_count = 0
        evening_count = 0
        valid_departures = 0
        total_stops = 0

        for trip in route_trip_list:
            total_stops += trip["stop_count"]

            start = trip["departure"]
            end = trip["arrival"]

            if start is not None:
                hour = start / 3600
                departure_hours.append(hour)
                valid_departures += 1

                if 7 <= hour < 10:
                    morning_count += 1

                if 16 <= hour < 19:
                    evening_count += 1

            if start is not None and end is not None and end >= start:
                valid_durations.append((end - start) / 60)

        trip_count = len(route_trip_list)

        row = {
            **route,
            "trip_count": trip_count,
            "unique_stop_count": len(
                route_stop_sets.get(route_id, set())
            ),
            "avg_stops_per_trip": (
                total_stops / trip_count if trip_count else 0
            ),
            "avg_trip_duration_min": (
                mean(valid_durations) if valid_durations else 0
            ),
            "avg_departure_hour": (
                mean(departure_hours) if departure_hours else 0
            ),
            "morning_peak_share": (
                morning_count / valid_departures
                if valid_departures else 0
            ),
            "evening_peak_share": (
                evening_count / valid_departures
                if valid_departures else 0
            ),
            "valid_duration_trip_count": len(valid_durations),
            "valid_departure_trip_count": valid_departures,
        }

        rows.append(row)

    return rows


def main():
    if not DATA.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA}")

    RESULTS.mkdir(parents=True, exist_ok=True)

    print("Loading routes and trips...", flush=True)

    routes = load_routes()
    trips = load_trips()

    route_stop_sets = defaultdict(set)

    print(f"Loaded {len(routes):,} routes", flush=True)
    print(f"Loaded {len(trips):,} trips", flush=True)

    process_stop_times(trips, route_stop_sets)

    print("Building route-level features...", flush=True)

    rows = build_route_features(routes, trips, route_stop_sets)

    output_csv = RESULTS / "route_features.csv"

    if rows:
        with output_csv.open(
            "w", encoding="utf-8-sig", newline=""
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=list(rows[0].keys())
            )
            writer.writeheader()
            writer.writerows(rows)

    summary = {
        "routes_processed": len(rows),
        "trips_processed": len(trips),
        "routes_with_trips": sum(
            row["trip_count"] > 0 for row in rows
        ),
        "routes_without_trips": sum(
            row["trip_count"] == 0 for row in rows
        ),
        "features": [
            "trip_count",
            "unique_stop_count",
            "avg_stops_per_trip",
            "avg_trip_duration_min",
            "avg_departure_hour",
            "morning_peak_share",
            "evening_peak_share",
        ],
        "output_file": str(output_csv),
        "interpretation": (
            "Scheduled service features, not observed traffic measurements."
        ),
    }

    output_json = RESULTS / "feature_engineering_summary.json"

    with output_json.open("w", encoding="utf-8") as file:
        json.dump(summary, file, indent=4)

    print("\nFEATURE ENGINEERING COMPLETE")
    print(json.dumps(summary, indent=4))
    print("\nSaved:", output_csv)


if __name__ == "__main__":
    main()

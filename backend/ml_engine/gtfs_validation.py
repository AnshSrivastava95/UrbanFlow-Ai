
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "raw" / "bmtc_gtfs"
OUTPUT = ROOT / "results"

def load_column(filename, column):
    path = DATA / filename
    values = set()

    with path.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            value = row.get(column)
            if value:
                values.add(value)

    return values


def main():
    print("\nURBANFLOW GTFS RELATIONSHIP VALIDATION\n")

    routes = load_column("routes.txt", "route_id")
    trips = load_column("trips.txt", "trip_id")
    stops = load_column("stops.txt", "stop_id")
    shapes = load_column("shapes.txt", "shape_id")

    trip_routes = {}
    trip_shapes = {}

    with (DATA / "trips.txt").open(
        encoding="utf-8-sig", newline=""
    ) as f:
        for row in csv.DictReader(f):
            trip_routes[row["trip_id"]] = row["route_id"]
            trip_shapes[row["trip_id"]] = row.get("shape_id", "")

    missing_route_refs = sum(
        route_id not in routes
        for route_id in trip_routes.values()
    )

    missing_shape_refs = sum(
        shape_id and shape_id not in shapes
        for shape_id in trip_shapes.values()
    )

    missing_trip_refs = 0
    missing_stop_refs = 0
    stop_time_rows = 0
    invalid_time_rows = 0

    def valid_time(value):
        try:
            parts = value.split(":")
            if len(parts) != 3:
                return False

            hours, minutes, seconds = map(int, parts)
            return (
                hours >= 0 and
                0 <= minutes < 60 and
                0 <= seconds < 60
            )
        except (ValueError, AttributeError):
            return False

    with (DATA / "stop_times.txt").open(
        encoding="utf-8-sig", newline=""
    ) as f:
        for row in csv.DictReader(f):
            stop_time_rows += 1

            if row["trip_id"] not in trips:
                missing_trip_refs += 1

            if row["stop_id"] not in stops:
                missing_stop_refs += 1

            if not valid_time(row.get("arrival_time", "")):
                invalid_time_rows += 1

    report = {
        "unique_routes": len(routes),
        "unique_trips": len(trips),
        "unique_stops": len(stops),
        "unique_shapes": len(shapes),
        "stop_time_records": stop_time_rows,
        "missing_route_references": missing_route_refs,
        "missing_shape_references": missing_shape_refs,
        "missing_trip_references": missing_trip_refs,
        "missing_stop_references": missing_stop_refs,
        "invalid_arrival_times": invalid_time_rows
    }

    OUTPUT.mkdir(exist_ok=True)
    output_file = OUTPUT / "gtfs_validation.json"

    with output_file.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)

    print(json.dumps(report, indent=4))
    print("\nSaved:", output_file)


if __name__ == "__main__":
    main()


import csv
import json
from pathlib import Path
from collections import Counter

PROJECT_ROOT = Path(__file__).resolve().parents[1]
GTFS_DIR = PROJECT_ROOT / "data" / "raw" / "bmtc_gtfs"

REQUIRED_FILES = [
    "agency.txt",
    "routes.txt",
    "trips.txt",
    "stops.txt",
    "stop_times.txt",
    "calendar.txt",
]

OPTIONAL_FILES = [
    "calendar_dates.txt",
    "shapes.txt",
    "frequencies.txt",
    "transfers.txt",
    "feed_info.txt",
]

def inspect_file(file_path):
    result = {
        "file": file_path.name,
        "exists": file_path.exists(),
        "rows": 0,
        "columns": [],
        "missing_values": {},
        "duplicate_rows": 0,
        "size_mb": 0,
        "errors": [],
    }

    if not file_path.exists():
        return result

    result["size_mb"] = round(
        file_path.stat().st_size / (1024 * 1024), 3
    )

    try:
        missing = Counter()
        seen = set()

        with file_path.open(
            "r", encoding="utf-8-sig", newline=""
        ) as file:
            reader = csv.DictReader(file)

            result["columns"] = reader.fieldnames or []

            for row in reader:
                result["rows"] += 1

                for column, value in row.items():
                    if value is None or not value.strip():
                        missing[column] += 1

                row_key = tuple(
                    sorted((key, value) for key, value in row.items())
                )

                if row_key in seen:
                    result["duplicate_rows"] += 1
                else:
                    seen.add(row_key)

        result["missing_values"] = dict(missing)

    except Exception as error:
        result["errors"].append(str(error))

    return result


def inspect_dataset():
    if not GTFS_DIR.exists():
        raise FileNotFoundError(
            f"GTFS directory not found: {GTFS_DIR}"
        )

    reports = []
    total_size = 0

    all_files = sorted(GTFS_DIR.glob("*.txt"))

    for file_path in all_files:
        report = inspect_file(file_path)
        reports.append(report)
        total_size += report["size_mb"]

    present_files = {item["file"] for item in reports}

    missing_required = [
        name for name in REQUIRED_FILES
        if name not in present_files
    ]

    missing_optional = [
        name for name in OPTIONAL_FILES
        if name not in present_files
    ]

    summary = {
        "dataset_directory": str(GTFS_DIR),
        "total_files": len(reports),
        "total_size_mb": round(total_size, 3),
        "missing_required_files": missing_required,
        "missing_optional_files": missing_optional,
        "files": reports,
    }

    return summary


if __name__ == "__main__":
    report = inspect_dataset()

    output_dir = PROJECT_ROOT / "results"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / "dataset_inspection.json"

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(report, file, indent=4)

    print("\n========== URBANFLOW GTFS INSPECTOR ==========")
    print("Files found:", report["total_files"])
    print("Total size:", report["total_size_mb"], "MB")
    print("Missing required files:",
          report["missing_required_files"])

    for item in report["files"]:
        print(
            f"{item['file']:<22}"
            f"Rows: {item['rows']:<12}"
            f"Size: {item['size_mb']} MB"
        )

    print("\nReport saved to:", output_file)

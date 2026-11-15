# UrbanFlow AI — Bengaluru Research Dataset Starter

## What this package is
A compact, reproducible research starter dataset designed to let you build the complete UrbanFlow AI pipeline locally. It contains CSV tables for bus operations, traffic movements, vehicle composition, intersection geometry, road-design alternatives and SUMO demand scenarios.

**It is not a fully observed real-world Bengaluru dataset.** Most row-level observations are synthetic and are explicitly labelled `synthetic_for_pipeline_testing`. They are for software development, testing, and experiment design only. Do not use them as empirical evidence or claim they were measured in Bengaluru.

## Real-world reference material included
`published_reference_counts.csv` contains a small set of aggregate peak-hour PCU figures previously identified from the BBMP Comprehensive Traffic Management Plan (December 2024). These are aggregate report values, not raw turning movements, not vehicle counts, and not enough to calibrate an intersection by themselves. Verify each value against the source report before publication.

Candidate junction coordinates and geometry are approximate placeholders. Verify them using current OpenStreetMap data and a field survey. The road-design dimensions are conceptual placeholders, not engineering designs.

## Files
- `intersections.csv`: case-study candidates and approximate locations.
- `published_reference_counts.csv`: aggregate BBMP report reference values.
- `bus_routes.csv`: synthetic route metadata placeholders.
- `bus_observations.csv`: synthetic segment-time bus observations.
- `turning_movements.csv`: synthetic approach/turn movements.
- `vehicle_composition.csv`: synthetic Indian vehicle-class sample proportions.
- `traffic_observations.csv`: synthetic time-window traffic features.
- `intersection_geometry.csv`: conceptual design parameters; not surveyed.
- `road_designs.csv`: candidate design types and constraints.
- `simulation_scenarios.csv`: controlled SUMO demand scenarios.
- `data_dictionary.csv`: units, provenance and limitations.
- `scripts/baseline_clustering.py`: baseline K-Means/PCA experiment on synthetic data.

## Reproducibility
Random seed: 20261115. Data generation settings are fixed in the build record. The CSVs are intentionally small and total well below 10 GB.

## Run baseline clustering
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install pandas numpy scikit-learn matplotlib
python scripts/baseline_clustering.py
```

## Real research data still required
To make publishable claims, replace or supplement synthetic rows with verified source data:
1. BBMP raw turning-movement / traffic survey tables for the selected junction and time periods.
2. Properly licensed BMD-45 / UVH-26 annotation data and metadata if using image-derived vehicle counts.
3. Current BMTC GTFS data from a verified source; GTFS schedules are not observed GPS trajectories.
4. Current OSM road network and measured lane/approach geometry.
5. Field counts or timestamped camera observations to estimate real traffic flow and vehicle composition.

Keep real, published aggregate, extracted, and synthetic observations in separate tables with provenance. Never merge them without retaining a `data_origin` column.

## Suggested citations and source portals
- BBMP / OpenCity Bengaluru traffic plan: https://data.opencity.in/
- BMD-45: https://huggingface.co/datasets/iisc-aim/BMD-45
- UVH-26: https://huggingface.co/datasets/iisc-aim/UVH-26
- OpenStreetMap: https://www.openstreetmap.org/
- SUMO: https://sumo.dlr.de/docs/
- BMTC official portal: https://mybmtc.karnataka.gov.in/

Review dataset licences and cite original sources in the research paper.

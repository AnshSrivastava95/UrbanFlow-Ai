from pathlib import Path
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

# IMPORTANT: this example uses explicitly synthetic traffic rows.
df = pd.read_csv(DATA / "traffic_observations.csv")
features = [
    "total_pcu_per_hour", "mean_speed_kmh_assumed",
    "mean_delay_sec_assumed", "queue_length_vehicles_assumed",
    "pedestrians_per_hour_assumed", "cyclists_per_hour_assumed",
    "heavy_vehicle_share_assumed"
]
X = df[features].fillna(df[features].median())
Xs = StandardScaler().fit_transform(X)

rows = []
for k in range(2, 8):
    labels = KMeans(n_clusters=k, n_init=20, random_state=42).fit_predict(Xs)
    rows.append({
        "algorithm": "KMeans", "k": k,
        "silhouette": silhouette_score(Xs, labels),
        "davies_bouldin": davies_bouldin_score(Xs, labels)
    })
result = pd.DataFrame(rows)
result.to_csv(ROOT / "clustering_metrics_synthetic.csv", index=False)
print(result.to_string(index=False))

best_k = int(result.sort_values("silhouette", ascending=False).iloc[0]["k"])
labels = KMeans(n_clusters=best_k, n_init=20, random_state=42).fit_predict(Xs)
df["cluster"] = labels
df.to_csv(ROOT / "traffic_clusters_synthetic.csv", index=False)

pca = PCA(n_components=2, random_state=42)
Z = pca.fit_transform(Xs)
plt.figure(figsize=(8, 6))
plt.scatter(Z[:, 0], Z[:, 1], c=labels, s=12)
plt.xlabel("PC1")
plt.ylabel("PC2")
plt.title("UrbanFlow AI — Synthetic traffic clusters (pipeline test only)")
plt.tight_layout()
plt.savefig(ROOT / "pca_clusters_synthetic.png", dpi=160)
print("Saved synthetic clustering outputs. Do NOT report these as real-world findings.")

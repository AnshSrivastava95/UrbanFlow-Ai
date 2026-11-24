import { useEffect, useMemo, useState } from "react";
import { getTrafficSummary } from "./api";
import { motion } from "framer-motion";
import { BrowserRouter, Routes, Route as RouterRoute, NavLink, Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  CircleDot,
  Clock3,
  Code2,
  Layers3,
  Menu,
  Network,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
  RefreshCw,
  Database,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import "./index.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const FEATURES = [
  "trip_count",
  "unique_stop_count",
  "avg_stops_per_trip",
  "avg_trip_duration_min",
  "avg_departure_hour",
  "morning_peak_share",
  "evening_peak_share",
];

const FEATURE_LABELS = {
  trip_count: "Trip count",
  unique_stop_count: "Unique stops",
  avg_stops_per_trip: "Average stops per trip",
  avg_trip_duration_min: "Average trip duration",
  avg_departure_hour: "Average departure hour",
  morning_peak_share: "Morning peak share",
  evening_peak_share: "Evening peak share",
};

const CLUSTER_INFO = [
  {
    id: 0,
    name: "Moderate-stop routes",
    description: "Routes with relatively shorter scheduled journeys.",
    color: "#c9a96e",
  },
  {
    id: 1,
    name: "Morning-focused routes",
    description: "Routes with a strong concentration of morning departures.",
    color: "#83a6c9",
  },
  {
    id: 2,
    name: "Evening-focused routes",
    description: "Routes with a strong concentration of evening departures.",
    color: "#a78bca",
  },
  {
    id: 3,
    name: "Longer scheduled routes",
    description: "Routes with more stops and longer scheduled journeys.",
    color: "#79b5a2",
  },
  {
    id: 4,
    name: "High-frequency routes",
    description: "Routes with substantially more scheduled trips.",
    color: "#d28c79",
  },
];

const FEATURES_LIST = [
  {
    number: "01",
    icon: BrainCircuit,
    title: "Behaviour Intelligence",
    description:
      "Uncover hidden patterns in urban mobility through unsupervised machine learning and behavioural clustering.",
  },
  {
    number: "02",
    icon: RouteIcon,
    title: "Mobility Mapping",
    description:
      "Explore how buses, vehicles and road networks interact across the urban transportation ecosystem.",
  },
  {
    number: "03",
    icon: Network,
    title: "Intersection Innovation",
    description:
      "Investigate alternative intersection configurations through data-driven traffic analysis.",
  },
  {
    number: "04",
    icon: Activity,
    title: "Simulation & Evaluation",
    description:
      "Evaluate traffic scenarios using microscopic simulation and measurable performance indicators.",
  },
];

const stats = [
  { value: "01", label: "Research city", sub: "Bengaluru, India" },
  { value: "04", label: "Core capabilities", sub: "From data to simulation" },
  { value: "AI", label: "Research approach", sub: "Unsupervised learning" },
];

const dashboardCSS = `
.analytics-dashboard {
  width: 100%;
  color: #eee9df;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: inherit;
}
.analytics-dashboard * { box-sizing: border-box; }
.analytics-dashboard .analytics-card {
  background: rgba(255,255,255,.025);
  border: 1px solid rgba(201,169,110,.17);
  border-radius: 13px;
  padding: 22px;
  min-width: 0;
}
.analytics-dashboard .analytics-heading {
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  flex-wrap:wrap;
  margin-bottom:20px;
}
.analytics-dashboard .analytics-heading h3 {
  color:#f0e8dc;
  font-family:inherit;
  font-size:18px;
  font-weight:500;
  margin:5px 0 0;
}
.analytics-dashboard .analytics-heading p {
  color:#9d978d;
  font-size:12px;
  line-height:1.6;
  margin:7px 0 0;
}
.analytics-dashboard .analytics-eyebrow {
  color:#c9a96e;
  font-size:9px;
  letter-spacing:2px;
  font-weight:600;
}
.analytics-dashboard .analytics-metrics {
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
}
.analytics-dashboard .analytics-metric {
  border:1px solid rgba(201,169,110,.16);
  background:rgba(255,255,255,.025);
  border-radius:12px;
  padding:18px;
  min-width:0;
}
.analytics-dashboard .analytics-metric span {
  color:#9d978d;
  display:block;
  font-size:10px;
  letter-spacing:1px;
  text-transform:uppercase;
}
.analytics-dashboard .analytics-metric strong {
  display:block;
  color:#d5b77e;
  font-size:27px;
  font-weight:500;
  margin-top:12px;
  overflow-wrap:anywhere;
}
.analytics-dashboard .analytics-metric small {
  display:block;
  color:#89847b;
  font-size:10px;
  margin-top:5px;
}
.analytics-dashboard .analytics-grid {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;
}
.analytics-dashboard .analytics-chart {
  width:100%;
  height:310px;
}
.analytics-dashboard .analytics-chart.tall { height:390px; }
.analytics-dashboard .analytics-note {
  color:#89847b;
  font-size:11px;
  line-height:1.7;
  margin-top:12px;
}
.analytics-dashboard .analytics-legend {
  display:flex;
  gap:13px;
  flex-wrap:wrap;
  margin-top:12px;
}
.analytics-dashboard .analytics-legend-item {
  display:flex;
  gap:6px;
  align-items:center;
  color:#b6b0a6;
  font-size:10px;
}
.analytics-dashboard .analytics-dot {
  width:8px;height:8px;border-radius:50%;display:inline-block;
}
.analytics-dashboard .analytics-toolbar {
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:16px;
}
.analytics-dashboard input,
.analytics-dashboard select {
  background:#171715;
  border:1px solid rgba(201,169,110,.25);
  color:#eee9df;
  padding:11px 13px;
  border-radius:7px;
  font:inherit;
  font-size:12px;
  min-width:0;
}
.analytics-dashboard input { flex:1; min-width:170px; }
.analytics-dashboard select { min-width:130px; }
.analytics-dashboard .analytics-button {
  border:1px solid rgba(201,169,110,.4);
  background:rgba(201,169,110,.08);
  color:#d5b77e;
  border-radius:7px;
  padding:10px 14px;
  cursor:pointer;
  font-size:11px;
}
.analytics-dashboard .analytics-button:hover {
  background:rgba(201,169,110,.16);
}
.analytics-dashboard .analytics-table-wrap {
  width:100%;
  overflow-x:auto;
}
.analytics-dashboard table {
  width:100%;
  border-collapse:collapse;
  min-width:650px;
  font-size:11px;
}
.analytics-dashboard th {
  color:#c9a96e;
  font-weight:500;
  text-align:left;
  padding:13px 12px;
  border-bottom:1px solid rgba(201,169,110,.2);
  white-space:nowrap;
}
.analytics-dashboard td {
  color:#c1bbb1;
  padding:13px 12px;
  border-bottom:1px solid rgba(255,255,255,.055);
}
.analytics-dashboard tr:hover td { background:rgba(201,169,110,.035); }
.analytics-dashboard .cluster-pill {
  display:inline-flex;
  align-items:center;
  gap:6px;
  border:1px solid rgba(255,255,255,.09);
  padding:5px 8px;
  border-radius:20px;
  white-space:nowrap;
  font-size:10px;
}
.analytics-dashboard .analytics-status {
  display:flex;
  align-items:center;
  gap:8px;
  color:#91bda4;
  font-size:10px;
  letter-spacing:1px;
}
.analytics-dashboard .analytics-status span {
  width:7px;height:7px;border-radius:50%;background:#83b89b;
  box-shadow:0 0 10px #83b89b;
}
.analytics-dashboard .analytics-empty {
  color:#999187;
  font-size:12px;
  padding:28px 5px;
  text-align:center;
}
.analytics-dashboard .profile-grid {
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:10px;
}
.analytics-dashboard .profile-card {
  background:rgba(255,255,255,.02);
  border:1px solid rgba(201,169,110,.15);
  border-radius:10px;
  padding:14px;
  min-width:0;
}
.analytics-dashboard .profile-card h4 {
  color:#d5b77e;
  font-size:12px;
  font-weight:500;
  margin:0 0 10px;
}
.analytics-dashboard .profile-card strong {
  display:block;
  color:#eee9df;
  font-size:21px;
  font-weight:500;
}
.analytics-dashboard .profile-card p {
  color:#999187;
  font-size:10px;
  line-height:1.5;
  margin:7px 0 0;
}
.analytics-dashboard .validation-row {
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:12px 0;
  border-bottom:1px solid rgba(255,255,255,.06);
  font-size:11px;
}
.analytics-dashboard .validation-row span { color:#999187; }
.analytics-dashboard .validation-row strong { color:#d5b77e; font-weight:500; }
.analytics-dashboard .page-controls {
  display:flex;justify-content:space-between;align-items:center;
  gap:10px;margin-top:15px;flex-wrap:wrap;
  color:#999187;font-size:11px;
}
@media(max-width:850px) {
  .analytics-dashboard .analytics-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .analytics-dashboard .profile-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media(max-width:600px) {
  .analytics-dashboard .analytics-grid { grid-template-columns:1fr; }
  .analytics-dashboard .analytics-card { padding:15px; }
  .analytics-dashboard .analytics-metric { padding:13px; }
  .analytics-dashboard .analytics-metric strong { font-size:22px; }
  .analytics-dashboard .analytics-chart { height:270px; }
  .analytics-dashboard .analytics-chart.tall { height:320px; }
}
`;

async function apiRequest(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${path}`);
  }
  return response.json();
}

function getRows(data) {
  if (Array.isArray(data)) return data;
  return data?.rows || data?.routes || data?.items || data?.data || [];
}

function getClusterColor(id) {
  return CLUSTER_INFO.find((item) => item.id === Number(id))?.color || "#999";
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
  });
}

function getClusterName(id) {
  return CLUSTER_INFO.find((item) => item.id === Number(id))?.name || `Cluster ${id}`;
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const exploreLinks = [
    ["/", "Home"],
    ["/routes", "Find a bus"],
    ["/compare", "Compare"],
  ];
  const researchLinks = [
    ["/analytics", "Analytics"],
    ["/insights", "AI insights"],
    ["/methodology", "Methodology"],
  ];

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span className="brand-mark"><Waypoints size={21} /></span>
        <span>URBAN<span>FLOW</span><small>AI MOBILITY PLATFORM</small></span>
      </Link>

      <button
        className="menu-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        {open ? <X /> : <Menu />}
      </button>

      <nav className={open ? "nav-links nav-open" : "nav-links"}>
        <span className="nav-group-label">EXPLORE</span>
        {exploreLinks.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
        <span className="nav-group-label nav-research-label">INTELLIGENCE</span>
        {researchLinks.map(([to, label]) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
        <NavLink className="nav-mobile-cta" to="/routes" onClick={() => setOpen(false)}>
          Explore bus routes <ArrowUpRight size={15} />
        </NavLink>
      </nav>

      <Link className="nav-cta" to="/routes">
        Find a bus route <ArrowUpRight size={15} />
      </Link>
    </header>
  );
}

function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [pca, setPca] = useState(null);
  const [features, setFeatures] = useState(null);
  const [validation, setValidation] = useState(null);
  const [clusters, setClusters] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routeTotal, setRouteTotal] = useState(0);
  const [pcaClusterFilter, setPcaClusterFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const results = await Promise.allSettled([
          getTrafficSummary(),
          apiRequest("/api/analytics/pca"),
          apiRequest("/api/analytics/features"),
          apiRequest("/api/analytics/validation"),
          apiRequest("/api/clusters"),
        ]);

        if (!active) return;

        const [summaryResult, pcaResult, featuresResult, validationResult, clustersResult] = results;

        if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
        if (pcaResult.status === "fulfilled") setPca(pcaResult.value);
        if (featuresResult.status === "fulfilled") setFeatures(featuresResult.value);
        if (validationResult.status === "fulfilled") setValidation(validationResult.value);
        if (clustersResult.status === "fulfilled") setClusters(clustersResult.value);

        const failures = results.filter((item) => item.status === "rejected");
        if (failures.length === results.length) {
          throw new Error("Unable to load analytics from the backend.");
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;

    async function loadRoutes() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });

        if (search.trim()) params.set("search", search.trim());
        if (selectedCluster !== "all") params.set("cluster", selectedCluster);

        const result = await apiRequest(`/api/routes?${params.toString()}`);

        if (!active) return;

        setRoutes(getRows(result));
        setRouteTotal(
          result.total ??
          result.total_routes ??
          result.count ??
          getRows(result).length
        );
      } catch (err) {
        if (active) {
          console.error("Route explorer error:", err);
          setRoutes([]);
          setRouteTotal(0);
        }
      }
    }

    loadRoutes();

    return () => {
      active = false;
    };
  }, [page, search, selectedCluster, refreshKey]);

  const pcaPoints = useMemo(() => {
    const points = pca?.points || pca?.data || [];
    return points.map((point) => ({
      ...point,
      pca_1: Number(point.pca_1),
      pca_2: Number(point.pca_2),
      cluster: Number(point.cluster),
    }));
  }, [pca]);

  const featureImportance = useMemo(() => {
    return (features?.feature_importance || []).map((item) => ({
      ...item,
      label: FEATURE_LABELS[item.feature] || item.feature,
      f_score: Number(item.f_score),
      eta_squared: Number(item.eta_squared),
    }));
  }, [features]);

  const clusterDistribution = useMemo(() => {
    const sizes = validation?.cluster_sizes || summary?.cluster_sizes || [];
    return sizes.map((count, index) => ({
      name: `Cluster ${index}`,
      cluster: index,
      value: Number(count),
      color: getClusterColor(index),
    }));
  }, [validation, summary]);

  const totalRoutes =
    summary?.route_count ??
    summary?.total_routes ??
    pcaPoints.length ??
    0;

  const silhouette = validation?.silhouette ?? summary?.silhouette_score;
  const daviesBouldin = validation?.davies_bouldin ?? summary?.davies_bouldin;
  const pcaVariance =
    validation?.pca?.total_explained_variance ??
    pca?.total_explained_variance;

  const stability = validation?.stability || [];
  const clusterProfileRows =
    clusters?.profiles ||
    clusters?.clusters ||
    clusters?.data ||
    [];

  const getProfileValue = (clusterId, feature) => {
    const profile = clusterProfileRows.find(
      (item) => Number(item.cluster) === Number(clusterId)
    );
    if (!profile) return null;

    if (profile.mean && profile.mean[feature] !== undefined) {
      return profile.mean[feature];
    }
    if (profile.features && profile.features[feature] !== undefined) {
      return profile.features[feature];
    }
    return profile[feature] ?? null;
  };

  return (
    <div className="analytics-dashboard">
      <style>{dashboardCSS}</style>

      <div className="analytics-card">
        <div className="analytics-heading">
          <div>
            <span className="analytics-eyebrow">URBANFLOW / RESEARCH ANALYTICS</span>
            <h3>Bus Route Behaviour Analysis</h3>
            <p>
              BMTC GTFS scheduled-service dataset · Bengaluru, India ·
              Unsupervised learning
            </p>
          </div>
          <div className="analytics-status">
            <span /> API CONNECTED
          </div>
        </div>

        <div className="analytics-toolbar">
          <span className="analytics-note" style={{ margin: 0 }}>
            <Database size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Model: {validation?.model || "K-Means with StandardScaler"}
          </span>
          <button
            className="analytics-button"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            <RefreshCw size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />
            Refresh analytics
          </button>
        </div>

        {error && (
          <p className="analytics-note" style={{ color: "#d28c79" }}>
            {error}
          </p>
        )}

        {loading && !summary && (
          <div className="analytics-empty">Loading research analytics...</div>
        )}

        <div className="analytics-metrics">
          <div className="analytics-metric">
            <span>Routes analysed</span>
            <strong>{formatNumber(totalRoutes, 0)}</strong>
            <small>BMTC route records</small>
          </div>
          <div className="analytics-metric">
            <span>Clusters generated</span>
            <strong>{validation?.cluster_count ?? summary?.cluster_count ?? 5}</strong>
            <small>K-Means groups</small>
          </div>
          <div className="analytics-metric">
            <span>Silhouette score</span>
            <strong>{formatNumber(silhouette, 4)}</strong>
            <small>Cluster separation</small>
          </div>
          <div className="analytics-metric">
            <span>PCA variance</span>
            <strong>{pcaVariance == null ? "—" : `${(pcaVariance * 100).toFixed(1)}%`}</strong>
            <small>First two components</small>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-heading">
            <div>
              <span className="analytics-eyebrow">CLUSTER DISTRIBUTION</span>
              <h3>Route allocation</h3>
              <p>Number of routes assigned to each K-Means cluster.</p>
            </div>
          </div>

          <div className="analytics-chart">
            {clusterDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clusterDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {clusterDistribution.map((item) => (
                      <Cell key={item.cluster} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#171715",
                      border: "1px solid #6f5b3c",
                      borderRadius: 8,
                      color: "#eee9df",
                      fontSize: 11,
                    }}
                    formatter={(value) => [formatNumber(value, 0), "Routes"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#aaa" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">Cluster distribution unavailable.</div>
            )}
          </div>

          <div className="analytics-legend">
            {clusterDistribution.map((item) => (
              <span className="analytics-legend-item" key={item.cluster}>
                <i className="analytics-dot" style={{ background: item.color }} />
                {item.name}: {formatNumber(item.value, 0)}
              </span>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-heading">
            <div>
              <span className="analytics-eyebrow">MODEL VALIDATION</span>
              <h3>Clustering performance</h3>
              <p>Evaluation metrics for the selected five-cluster model.</p>
            </div>
          </div>

          <div className="validation-row">
            <span>Algorithm</span>
            <strong>K-Means</strong>
          </div>
          <div className="validation-row">
            <span>Scaling method</span>
            <strong>StandardScaler</strong>
          </div>
          <div className="validation-row">
            <span>Cluster count</span>
            <strong>{validation?.cluster_count ?? 5}</strong>
          </div>
          <div className="validation-row">
            <span>Silhouette score</span>
            <strong>{formatNumber(silhouette, 4)}</strong>
          </div>
          <div className="validation-row">
            <span>Davies–Bouldin index</span>
            <strong>{formatNumber(daviesBouldin, 4)}</strong>
          </div>
          <div className="validation-row">
            <span>PCA variance (2 components)</span>
            <strong>{pcaVariance == null ? "—" : `${(pcaVariance * 100).toFixed(2)}%`}</strong>
          </div>

          <p className="analytics-note">
            Silhouette is estimated using a cluster-aware sample. Davies–Bouldin
            is calculated on the full dataset. Higher Silhouette and lower
            Davies–Bouldin values are generally preferred.
          </p>
        </div>
      </div>

      <div className="analytics-card pca-panel">
        <div className="analytics-heading pca-heading">
          <div>
            <span className="analytics-eyebrow">DIMENSIONALITY REDUCTION · PCA</span>
            <h3>Route behaviour map</h3>
            <p>Explore how scheduled routes distribute across the first two principal components. Select a cluster to isolate its points.</p>
          </div>
          <div className="pca-total"><strong>{formatNumber(pcaPoints.length, 0)}</strong><span>ROUTE PROJECTIONS</span></div>
        </div>
        <div className="pca-legend" aria-label="Filter PCA points by cluster">
          <button type="button" className={pcaClusterFilter === "all" ? "active" : ""} onClick={() => setPcaClusterFilter("all")}><span className="pca-legend-dot all" /> All clusters <b>{formatNumber(pcaPoints.length, 0)}</b></button>
          {CLUSTER_INFO.map((cluster) => {
            const count = pcaPoints.filter((point) => Number(point.cluster) === cluster.id).length;
            return <button type="button" key={cluster.id} className={String(pcaClusterFilter) === String(cluster.id) ? "active" : ""} onClick={() => setPcaClusterFilter(String(cluster.id))}><span className="pca-legend-dot" style={{ "--cluster-color": cluster.color }} /> Cluster {cluster.id} <b>{formatNumber(count, 0)}</b></button>;
          })}
        </div>
        <div className="analytics-chart tall pca-chart-wrap">
          {pcaPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 18, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,.055)" strokeDasharray="3 7" />
                <XAxis type="number" dataKey="pca_1" name="Principal component 1" tick={{ fill: "#938d81", fontSize: 10 }} axisLine={{ stroke: "rgba(214,166,77,.28)" }} tickLine={false} tickFormatter={(v) => Number(v).toFixed(1)} />
                <YAxis type="number" dataKey="pca_2" name="Principal component 2" tick={{ fill: "#938d81", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => Number(v).toFixed(1)} />
                <Tooltip cursor={{ stroke: "rgba(233,201,130,.5)", strokeDasharray: "4 4" }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload;
                  const cluster = CLUSTER_INFO.find((item) => item.id === Number(point.cluster));
                  return <div className="pca-tooltip"><span className="pca-tooltip-kicker">SCHEDULED ROUTE</span><strong>{point.route_short_name || point.route_id || "Unknown route"}</strong><span className="pca-tooltip-cluster" style={{ color: cluster?.color }}>{cluster?.name || `Cluster ${point.cluster}`}</span><div><span>PC 1</span><b>{formatNumber(point.pca_1, 3)}</b></div><div><span>PC 2</span><b>{formatNumber(point.pca_2, 3)}</b></div></div>;
                }} />
                {CLUSTER_INFO.map((cluster) => {
                  const visible = pcaClusterFilter === "all" || String(pcaClusterFilter) === String(cluster.id);
                  return <Scatter key={cluster.id} name={`Cluster ${cluster.id}`} data={pcaPoints.filter((point) => Number(point.cluster) === cluster.id)} fill={cluster.color} fillOpacity={visible ? 0.76 : 0.045} shape="circle" isAnimationActive={false} />;
                })}
              </ScatterChart>
            </ResponsiveContainer>
          ) : <div className="analytics-empty">PCA data is not available. Check the analytics PCA endpoint.</div>}
        </div>
        <div className="pca-footer"><div><span className="pca-footer-mark" /><span>Each dot represents one route</span></div><div><strong>{pcaVariance == null ? "63.08%" : `${(pcaVariance * 100).toFixed(2)}%`}</strong><span> variance retained by PC1 + PC2</span></div></div>
        <p className="analytics-note pca-disclaimer">PCA is a two-dimensional projection of the seven engineered schedule features. It helps visualise separation; it does not generate the clusters or represent geographic locations.</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-heading">
            <div>
              <span className="analytics-eyebrow">FEATURE ANALYSIS</span>
              <h3>Feature importance</h3>
              <p>ANOVA F-statistics across the generated clusters.</p>
            </div>
          </div>

          <div className="analytics-chart tall">
            {featureImportance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureImportance}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 25 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#999187", fontSize: 9 }}
                    axisLine={{ stroke: "#514a3d" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={125}
                    tick={{ fill: "#c5bdb1", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#171715",
                      border: "1px solid #806b48",
                      borderRadius: 8,
                      color: "#eee9df",
                      fontSize: 11,
                    }}
                    formatter={(value) => [formatNumber(value, 2), "F-statistic"]}
                  />
                  <Bar dataKey="f_score" radius={[0, 4, 4, 0]}>
                    {featureImportance.map((item, index) => (
                      <Cell
                        key={item.feature}
                        fill={index === 0 ? "#d5b77e" : "#8d7958"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-empty">Feature analysis unavailable.</div>
            )}
          </div>
          <p className="analytics-note">
            Eta-squared describes between-cluster variance. These are
            descriptive associations, not causal effects or independent
            predictive importance.
          </p>
        </div>

        <div className="analytics-card">
          <div className="analytics-heading">
            <div>
              <span className="analytics-eyebrow">REPRODUCIBILITY</span>
              <h3>Seed stability</h3>
              <p>Adjusted Rand Index against the reference partition.</p>
            </div>
          </div>

          {stability.length > 0 ? (
            stability.map((item) => (
              <div className="validation-row" key={item.seed}>
                <span>Random seed {item.seed}</span>
                <strong>ARI {formatNumber(item.adjusted_rand_index, 3)}</strong>
              </div>
            ))
          ) : (
            <div className="analytics-empty">Stability results unavailable.</div>
          )}

          <p className="analytics-note">
            An ARI of 1.0 means the assignments match the reference partition
            exactly for that run. This tests sensitivity to initialisation
            seeds, not stability under dataset changes.
          </p>
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-heading">
          <div>
            <span className="analytics-eyebrow">CLUSTER INTERPRETATION</span>
            <h3>Route behaviour profiles</h3>
            <p>
              Descriptive labels based on the seven scheduled-service features.
            </p>
          </div>
        </div>

        <div className="profile-grid">
          {CLUSTER_INFO.map((cluster) => {
            const count = validation?.cluster_sizes?.[cluster.id] ?? 0;
            const tripCount = getProfileValue(cluster.id, "trip_count");
            const stops = getProfileValue(cluster.id, "unique_stop_count");
            const duration = getProfileValue(cluster.id, "avg_trip_duration_min");

            return (
              <div className="profile-card" key={cluster.id}>
                <h4>
                  <i
                    className="analytics-dot"
                    style={{ background: cluster.color, marginRight: 7 }}
                  />
                  Cluster {cluster.id}
                </h4>
                <strong>{formatNumber(count, 0)}</strong>
                <p>{cluster.name}</p>
                <p>{cluster.description}</p>
                {tripCount != null && (
                  <p>Mean trips: {formatNumber(tripCount, 1)}</p>
                )}
                {stops != null && (
                  <p>Mean unique stops: {formatNumber(stops, 1)}</p>
                )}
                {duration != null && (
                  <p>Mean duration: {formatNumber(duration, 1)} min</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="analytics-note">
          These names describe scheduled-service patterns. They should not be
          interpreted as measured congestion levels or fixed operational
          categories.
        </p>
      </div>

      <div className="analytics-card">
        <div className="analytics-heading">
          <div>
            <span className="analytics-eyebrow">ROUTE-LEVEL EXPLORATION</span>
            <h3>Explore bus routes</h3>
            <p>Search route identifiers and inspect assigned clusters.</p>
          </div>
          <span className="analytics-note">
            {formatNumber(routeTotal, 0)} matching routes
          </span>
        </div>

        <div className="analytics-toolbar">
          <input
            type="search"
            placeholder="Search route number or route name..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            value={selectedCluster}
            onChange={(event) => {
              setSelectedCluster(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All clusters</option>
            {CLUSTER_INFO.map((cluster) => (
              <option value={cluster.id} key={cluster.id}>
                Cluster {cluster.id}
              </option>
            ))}
          </select>
        </div>

        <div className="analytics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route number</th>
                <th>Route name</th>
                <th>Cluster</th>
                <th>Trips</th>
                <th>Unique stops</th>
                <th>Avg. duration</th>
              </tr>
            </thead>
            <tbody>
              {routes.length > 0 ? (
                routes.map((route, index) => (
                  <tr key={route.route_id || index}>
                    <td>{route.route_short_name || route.route_id || "—"}</td>
                    <td>{route.route_long_name || "—"}</td>
                    <td>
                      <span className="cluster-pill">
                        <i
                          className="analytics-dot"
                          style={{ background: getClusterColor(route.cluster) }}
                        />
                        {getClusterName(route.cluster)}
                      </span>
                    </td>
                    <td>{formatNumber(route.trip_count, 0)}</td>
                    <td>{formatNumber(route.unique_stop_count, 0)}</td>
                    <td>{formatNumber(route.avg_trip_duration_min, 1)} min</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    No routes found. Try changing your search or cluster filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="page-controls">
          <span>Page {page} · Showing {routes.length} routes</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="analytics-button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <button
              className="analytics-button"
              disabled={page * pageSize >= routeTotal}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-heading">
          <div>
            <span className="analytics-eyebrow">DATASET CONTEXT</span>
            <h3>Research scope and limitations</h3>
          </div>
        </div>
        <div className="validation-row">
          <span>Dataset</span>
          <strong>BMTC GTFS</strong>
        </div>
        <div className="validation-row">
          <span>Learning approach</span>
          <strong>Unsupervised clustering</strong>
        </div>
        <div className="validation-row">
          <span>Feature count</span>
          <strong>7</strong>
        </div>
        <div className="validation-row">
          <span>Clustering algorithm</span>
          <strong>K-Means</strong>
        </div>
        <p className="analytics-note">
          GTFS schedule data represents planned transit service. It does not
          directly measure actual vehicle speed, road congestion, delays or
          real-time traffic conditions. Such conclusions require operational
          records or GPS observations. The clusters are exploratory patterns
          in scheduled route behaviour.
        </p>
      </div>
    </div>
  );
}

function TrafficPreview() {
  return <AnalyticsDashboard />;
}

function HomePage() {
  return (
    <main>

      <section className="hero" id="overview">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-grid" />

        <div className="hero-content">
          <Reveal>
            <div className="hero-label">
              <span className="label-line" />
              THE FUTURE OF URBAN MOBILITY
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <h1>
              Beyond traffic.
              <br />
              <span>Beyond signals.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.23}>
            <p className="hero-description">
              Explore Bengaluru's scheduled bus network through route-level data, explainable patterns and practical mobility insights.
            </p>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="hero-actions">
              <a href="#research" className="button-gold">
                Discover UrbanFlow <ArrowUpRight size={17} />
              </a>
              <a href="#technology" className="button-text">
                Explore our approach <ArrowDownRight size={17} />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.45}>
            <div className="hero-bottom">
              <div className="hero-location">
                <span className="location-pulse" />
                BENGALURU, INDIA
              </div>
              <span>AN AI-DRIVEN MOBILITY RESEARCH INITIATIVE</span>
            </div>
          </Reveal>
        </div>

        <div className="hero-side-note">01 / INTELLIGENT MOBILITY</div>
        <a href="#research" className="scroll-indicator">
          <span>SCROLL TO EXPLORE</span>
          <div><ArrowDownRight size={16} /></div>
        </a>
      </section>

      <section className="intro-section section-pad" id="research">
        <Reveal>
          <div className="section-kicker"><span>01</span> THE VISION</div>
          <div className="intro-grid">
            <h2>
              Cities are complex.
              <br />
              <em>Movement shouldn't be.</em>
            </h2>
            <div className="intro-copy">
              <p>
                UrbanFlow AI helps people explore Bengaluru's BMTC scheduled bus services while making the underlying mobility research accessible.
              </p>
              <p>
                Search route records, compare scheduled-service characteristics and understand how machine learning groups routes by their timetable patterns.
              </p>
              <a href="#technology" className="inline-link">
                Explore the research <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </Reveal>

        <div className="stats-row">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.1}>
              <div className="stat-item">
                <strong>{stat.value}</strong>
                <div>
                  <span>{stat.label}</span>
                  <small>{stat.sub}</small>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="features-section section-pad" id="technology">
        <Reveal>
          <div className="section-heading">
            <div>
              <div className="section-kicker"><span>02</span> OUR CAPABILITIES</div>
              <h2>Intelligence in <em>every direction.</em></h2>
            </div>
            <p>
              A practical public transport explorer backed by transparent data and reproducible machine-learning research.
            </p>
          </div>
        </Reveal>

        <div className="feature-grid">
          {FEATURES_LIST.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.number} delay={index * 0.1}>
                <article className="feature-card">
                  <div className="feature-top">
                    <span>{feature.number}</span>
                    <Icon size={24} strokeWidth={1.35} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-bottom">
                    <span>EXPLORE CAPABILITY</span>
                    <ArrowUpRight size={16} />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section section-pad" id="analytics">
        <Reveal>
          <div className="section-kicker"><span>03</span> THE INTELLIGENCE LAYER</div>
          <div className="dashboard-layout">
            <div className="dashboard-copy">
              <h2>
                See the city
                <br />
                <em>differently.</em>
              </h2>
              <p>
                Explore the actual clustering results generated from Bengaluru's BMTC scheduled bus-service data. These are timetable-derived patterns, not live traffic or vehicle positions.
              </p>
              <div className="dashboard-points">
                <div><CircleDot size={17} /> Explore five route-behaviour clusters</div>
                <div><Layers3 size={17} /> Visualise route groups using PCA</div>
                <div><BarChart3 size={17} /> Evaluate clustering performance</div>
              </div>
              <a href="#analytics-panel" className="button-outline">
                Explore analytics <ArrowUpRight size={16} />
              </a>
            </div>
            <Reveal delay={0.2}>
              <div id="analytics-panel">
                <TrafficPreview />
              </div>
            </Reveal>
          </div>
        </Reveal>
      </section>

      <section className="method-section section-pad">
        <Reveal>
          <div className="method-heading">
            <div className="section-kicker"><span>04</span> THE RESEARCH JOURNEY</div>
            <h2>From observation to <em>innovation.</em></h2>
            <p>Four connected stages. One data-driven research framework.</p>
          </div>
        </Reveal>

        <div className="method-track">
          {[
            ["01", "Collect", "Acquire and organise urban mobility observations.", Activity],
            ["02", "Discover", "Apply unsupervised learning to identify patterns.", BrainCircuit],
            ["03", "Evaluate", "Build and test alternative traffic scenarios.", BarChart3],
            ["04", "Understand", "Compare outcomes and interpret findings.", Sparkles],
          ].map(([number, title, description, Icon], index) => (
            <Reveal key={number} delay={index * 0.1}>
              <div className="method-step">
                <div className="method-icon"><Icon size={22} /></div>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="closing-section section-pad" id="about">
        <div className="closing-background" />
        <Reveal>
          <div className="closing-content">
            <div className="section-kicker"><span>05</span> A DIFFERENT WAY FORWARD</div>
            <h2>
              The next city
              <br />
              starts with <em>understanding.</em>
            </h2>
            <p>
              Discover the research, explore the technology and imagine
              what intelligent mobility could make possible.
            </p>
            <a href="#overview" className="button-gold">
              Back to the beginning <ArrowUpRight size={17} />
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="footer">
        <a className="brand" href="#overview">
          <span className="brand-mark"><Waypoints size={20} /></span>
          <span>URBAN<span>FLOW</span><small>AI RESEARCH PLATFORM</small></span>
        </a>
        <p>Understanding movement. Reimagining mobility.</p>
        <a
          href="https://github.com/AnshSrivastava95/UrbanFlow-Ai"
          target="_blank"
          rel="noreferrer"
          className="github-link"
        >
          <Code2 size={17} /> GitHub <ArrowUpRight size={14} />
        </a>
        <div className="footer-bottom">
          <span>© 2026 URBANFLOW AI. RESEARCH PROJECT.</span>
          <span>BUILT TO EXPLORE WHAT'S NEXT.</span>
        </div>
      </footer>
    </main>
  );
}

function PublicPageShell({ eyebrow, title, description, children }) {
  return (
    <main className="public-page">
      <section className="public-page-heading">
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      {children}
    </main>
  );
}

function BusRoutesPage() {
  const [search, setSearch] = useState("");
  const [cluster, setCluster] = useState("all");
  const [page, setPage] = useState(1);
  const [routes, setRoutes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(pageSize),
        });
        if (search.trim()) params.set("search", search.trim());
        if (cluster !== "all") params.set("cluster", cluster);
        const response = await fetch(`${API_URL}/api/routes?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Route search failed (${response.status})`);
        const result = await response.json();
        const rows = getRows(result);
        if (active) {
          setRoutes(rows);
          setTotal(result.total ?? result.total_routes ?? result.count ?? rows.length);
        }
      } catch (err) {
        if (active && err.name !== "AbortError") setError(err.message || "Unable to load routes.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [search, cluster, page]);

  return (
    <PublicPageShell
      eyebrow="PUBLIC BUS EXPLORER / BENGALURU"
      title={<>Find your next <em>bus route.</em></>}
      description="Search the available BMTC route records and explore their scheduled-service characteristics. This dataset describes planned service, not live bus locations or arrival predictions."
    >
      <section className="public-card">
        <div className="route-search-toolbar">
          <label className="route-search-input">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search route number or route name"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </label>
          <select
            aria-label="Filter by behaviour cluster"
            value={cluster}
            onChange={(event) => { setCluster(event.target.value); setPage(1); }}
          >
            <option value="all">All route patterns</option>
            {CLUSTER_INFO.map((item) => (
              <option value={item.id} key={item.id}>Cluster {item.id} · {item.name}</option>
            ))}
          </select>
        </div>

        <div className="route-results-heading">
          <div>
            <strong>{formatNumber(total, 0)}</strong>
            <span> matching route records</span>
          </div>
          <span className="data-context-tag">BMTC · GTFS schedule data</span>
        </div>

        {loading ? (
          <div className="public-empty">Loading route records…</div>
        ) : error ? (
          <div className="public-empty public-error">{error}</div>
        ) : routes.length === 0 ? (
          <div className="public-empty">No routes found. Try another route number or remove the filter.</div>
        ) : (
          <div className="public-route-grid">
            {routes.map((route, index) => (
              <Link
                className="public-route-card public-route-card-link"
                key={route.route_id || index}
                to={`/routes/${encodeURIComponent(route.route_id)}`}
                aria-label={`View timetable for route ${route.route_short_name || route.route_id}`}
              >
                <div className="public-route-card-top">
                  <span className="route-number">{route.route_short_name || route.route_id || "Route"}</span>
                  <span className="route-cluster" style={{ borderColor: getClusterColor(route.cluster) }}>
                    <i style={{ background: getClusterColor(route.cluster) }} />
                    Cluster {route.cluster}
                  </span>
                </div>
                <h3>{route.route_long_name || "Route name unavailable"}</h3>
                <div className="route-card-metrics">
                  <div><strong>{formatNumber(route.trip_count, 0)}</strong><span>Scheduled trips</span></div>
                  <div><strong>{formatNumber(route.unique_stop_count, 0)}</strong><span>Unique stops</span></div>
                  <div><strong>{formatNumber(route.avg_trip_duration_min, 0)}<small> min</small></strong><span>Avg. scheduled duration</span></div>
                </div>
                <p>{getClusterName(route.cluster)}</p>
                <span className="route-card-open">View timetable <ArrowUpRight size={14} /></span>
              </Link>
            ))}
          </div>
        )}

        <div className="public-pagination">
          <span>Page {page} · {routes.length} shown</span>
          <div>
            <button className="analytics-button" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</button>
            <button className="analytics-button" disabled={page * pageSize >= total} onClick={() => setPage((v) => v + 1)}>Next</button>
          </div>
        </div>
      </section>
      <p className="public-disclaimer">
        <ShieldCheck size={15} /> Route information is derived from the available static GTFS feed. Confirm current service with BMTC before travelling.
      </p>
    </PublicPageShell>
  );
}



function RouteDetailPage() {
  const { routeId } = useParams();
  const [serviceDate, setServiceDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  });
  const [schedule, setSchedule] = useState(null);
  const [selectedStop, setSelectedStop] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadSchedule(stopId = "") {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ date: serviceDate });
        if (stopId) params.set("stop_id", stopId);
        const response = await fetch(
          `${API_URL}/api/routes/${encodeURIComponent(routeId)}/schedule?${params}`,
          { signal: controller.signal }
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail || `Schedule request failed (${response.status})`);
        }
        if (active) {
          setSchedule(payload);
          if (!stopId && payload.stops?.length) {
            setSelectedStop(payload.stops[0].stop_id);
          }
        }
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Unable to load this route schedule.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSchedule(selectedStop);
    return () => {
      active = false;
      controller.abort();
    };
  }, [routeId, serviceDate, selectedStop]);

  const departures = schedule?.departures || [];
  const frequency = schedule?.frequency || [];
  const headway = schedule?.headway_summary;
  const maxFrequency = Math.max(1, ...frequency.map((item) => item.departure_count));

  useEffect(() => {
    setSelectedStop("");
  }, [routeId]);

  function formatDeparture(value) {
    if (!value) return "—";
    const [hourText, minuteText] = value.split(":");
    const hour = Number(hourText);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${minuteText} ${suffix}`;
  }

  return (
    <PublicPageShell
      eyebrow="PUBLIC BUS EXPLORER / ROUTE TIMETABLE"
      title={<>Route <em>{schedule?.route?.route_short_name || routeId}</em></>}
      description={schedule?.route?.route_long_name || "Explore the scheduled departures and boarding stops for this BMTC route."}
    >
      <div className="route-detail-actions">
        <Link to="/routes" className="inline-link"><ArrowRight size={15} /> Back to all routes</Link>
        <label className="route-date-picker">
          <span>Service date</span>
          <input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        </label>
      </div>

      {loading && !schedule ? (
        <section className="public-card public-empty">Loading route timetable…</section>
      ) : error ? (
        <section className="public-card public-empty public-error">{error}</section>
      ) : schedule ? (
        <>
          <section className="public-card route-detail-overview">
            <div className="route-detail-overview-top">
              <div>
                <span className="data-context-tag">BMTC · STATIC GTFS SCHEDULE</span>
                <h2>{schedule.route?.route_long_name || "Route details"}</h2>
                <p>Route ID: {schedule.route?.route_id}</p>
              </div>
              <span className="route-cluster">Scheduled service</span>
            </div>
            <div className="route-detail-metrics">
              <div><strong>{formatNumber(schedule.total_route_trips_in_feed, 0)}</strong><span>Trips in feed</span></div>
              <div><strong>{formatNumber(schedule.active_trips_on_date, 0)}</strong><span>Trips on selected date</span></div>
              <div><strong>{formatNumber(schedule.stops?.length, 0)}</strong><span>Stops on route</span></div>
            </div>
          </section>

          <section className="public-card route-timetable-panel">
            <div className="route-section-heading">
              <div>
                <span className="section-kicker">BOARDING INFORMATION</span>
                <h2>Choose your boarding stop</h2>
                <p>Departure times below are scheduled departures from this stop.</p>
              </div>
            </div>
            <label className="route-stop-select">
              <span>Boarding stop</span>
              <select value={selectedStop} onChange={(event) => setSelectedStop(event.target.value)}>
                <option value="">Select a stop</option>
                {(schedule.stops || []).map((stop) => (
                  <option key={stop.stop_id} value={stop.stop_id}>{stop.stop_name}{stop.stop_code ? ` (${stop.stop_code})` : ""}</option>
                ))}
              </select>
            </label>

            {loading ? <div className="public-empty">Updating departures…</div> : selectedStop && (
              <>
                <div className="route-detail-metrics headway-metrics">
                  <div><strong>{formatNumber(headway?.departure_count, 0)}</strong><span>Departures</span></div>
                  <div><strong>{headway ? `${headway.average_minutes} min` : "—"}</strong><span>Average gap</span></div>
                  <div><strong>{headway ? `${headway.median_minutes} min` : "—"}</strong><span>Median gap</span></div>
                  <div><strong>{headway ? `${headway.minimum_minutes}–${headway.maximum_minutes} min` : "—"}</strong><span>Min–max gap</span></div>
                </div>

                <div className="route-frequency-block">
                  <div className="route-section-heading">
                    <div><h3>Departures by hour</h3><p>Number of scheduled buses departing from the selected stop.</p></div>
                  </div>
                  {frequency.length ? (
                    <div className="route-frequency-chart">
                      {frequency.map((item) => (
                        <div className="route-frequency-column" key={item.hour} title={`${item.hour}: ${item.departure_count} departures`}>
                          <strong>{item.departure_count}</strong>
                          <div className="route-frequency-track"><i style={{ height: `${Math.max(5, item.departure_count / maxFrequency * 100)}%` }} /></div>
                          <span>{item.hour}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="public-empty">No scheduled departures for this stop on the selected date.</div>}
                </div>

                <div className="route-departure-list">
                  <div className="route-section-heading">
                    <div><h3>Scheduled departure times</h3><p>Sorted by departure time. Gap is measured from the previous listed bus.</p></div>
                    <span className="data-context-tag">{departures.length} departures</span>
                  </div>
                  {departures.length ? (
                    <div className="route-departure-table-wrap">
                      <table className="route-departure-table">
                        <thead><tr><th>#</th><th>Departure</th><th>Gap from previous bus</th></tr></thead>
                        <tbody>
                          {departures.map((item, index) => (
                            <tr key={`${item.trip_id}-${index}`}>
                              <td>{index + 1}</td>
                              <td><strong>{formatDeparture(item.departure_time)}</strong><small>{item.departure_time}</small></td>
                              <td>{item.headway_minutes_from_previous == null ? "—" : `${item.headway_minutes_from_previous} min`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="public-empty">No departures found for this stop and date.</div>}
                </div>
              </>
            )}
          </section>
          <p className="public-disclaimer"><ShieldCheck size={15} /> {schedule.schedule_note} This is not a live arrival prediction. Check with BMTC before travelling.</p>
        </>
      ) : null}
    </PublicPageShell>
  );
}

function ComparePage() {
  const [query, setQuery] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: "1", page_size: "100" });
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`${API_URL}/api/routes?${params}`);
        if (!response.ok) throw new Error(`Route lookup failed (${response.status})`);
        const result = await response.json();
        if (active) setRoutes(getRows(result));
      } catch (err) {
        if (active) setError(err.message || "Unable to load routes.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [query]);

  const chosen = routes.filter((route) => selected.includes(route.route_id));
  return (
    <PublicPageShell
      eyebrow="PUBLIC TOOL / ROUTE COMPARISON"
      title={<>Compare scheduled <em>bus routes.</em></>}
      description="Compare timetable-derived trip counts, stop coverage, journey duration and route behaviour clusters. This is not a live journey planner."
    >
      <section className="public-card">
        <label className="route-search-input compare-search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search routes to add to your comparison" />
        </label>
        <p className="compare-help">Select up to three routes from the search results.</p>
        {loading ? <div className="public-empty">Loading routes…</div> : error ? <div className="public-empty public-error">{error}</div> : (
          <div className="compare-options">
            {routes.slice(0, 30).map((route) => (
              <label key={route.route_id} className="compare-option">
                <input
                  type="checkbox"
                  checked={selected.includes(route.route_id)}
                  disabled={!selected.includes(route.route_id) && selected.length >= 3}
                  onChange={(e) => setSelected((current) => e.target.checked ? [...current, route.route_id] : current.filter((id) => id !== route.route_id))}
                />
                <span><strong>{route.route_short_name || route.route_id}</strong>{route.route_long_name}</span>
                <small>{getClusterName(route.cluster)}</small>
              </label>
            ))}
          </div>
        )}
      </section>
      {chosen.length > 0 && (
        <section className="public-card comparison-results">
          <div className="section-kicker">COMPARISON</div>
          <div className="comparison-grid">
            {chosen.map((route) => (
              <article className="comparison-card" key={route.route_id}>
                <span className="route-number">{route.route_short_name || route.route_id}</span>
                <h3>{route.route_long_name || "Route"}</h3>
                <div><strong>{formatNumber(route.trip_count, 0)}</strong><span>Scheduled trips</span></div>
                <div><strong>{formatNumber(route.unique_stop_count, 0)}</strong><span>Unique stops</span></div>
                <div><strong>{formatNumber(route.avg_stops_per_trip, 1)}</strong><span>Avg. stops per trip</span></div>
                <div><strong>{formatNumber(route.avg_trip_duration_min, 1)} min</strong><span>Avg. scheduled duration</span></div>
                <div><strong>{getClusterName(route.cluster)}</strong><span>Behaviour profile</span></div>
              </article>
            ))}
          </div>
        </section>
      )}
    </PublicPageShell>
  );
}

function InsightsPage() {
  return (
    <PublicPageShell
      eyebrow="INTELLIGENCE / ROUTE PATTERNS"
      title={<>What patterns emerge <em>from the schedules?</em></>}
      description="UrbanFlow groups route records by seven timetable-derived features. These profiles help explore scheduled-service patterns, not actual congestion or live operating conditions."
    >
      <div className="insights-grid">
        {CLUSTER_INFO.map((item) => (
          <article className="public-card insight-card" key={item.id}>
            <span className="insight-index" style={{ color: item.color }}>0{item.id + 1}</span>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <span className="insight-cluster" style={{ color: item.color }}>CLUSTER {item.id}</span>
          </article>
        ))}
      </div>
      <div className="public-card insight-note">
        <h2>How to interpret these patterns</h2>
        <p>The clustering model uses trip count, unique stop count, average stops per trip, average scheduled trip duration, average departure hour, morning peak share and evening peak share. The labels are descriptive summaries of the resulting groups.</p>
        <Link className="inline-link" to="/analytics">Explore the model results <ArrowUpRight size={16} /></Link>
      </div>
    </PublicPageShell>
  );
}

function MethodologyPage() {
  return (
    <PublicPageShell
      eyebrow="RESEARCH / METHODOLOGY"
      title={<>How the model <em>works.</em></>}
      description="A transparent overview of the data preparation, feature engineering, clustering and validation workflow."
    >
      <div className="methodology-grid">
        {[
          ["01", "Data preparation", "BMTC GTFS files are inspected and joined through route, trip, stop-time and stop identifiers. Referential integrity and time formats are checked."],
          ["02", "Feature engineering", "Seven route-level features summarise scheduled trip volume, stop coverage, trip duration and departure-time concentration."],
          ["03", "Preprocessing", "Numerical features are standardised before distance analysis and clustering."],
          ["04", "Clustering", "K-Means and hierarchical clustering are compared. K-Means with five clusters is used for the main route profiles."],
          ["05", "Evaluation", "Silhouette score, Davies–Bouldin index, PCA visualisation and seed-based Adjusted Rand Index are used to inspect results."],
        ].map(([number, title, body]) => (
          <article className="public-card methodology-step" key={number}>
            <span>{number}</span><h2>{title}</h2><p>{body}</p>
          </article>
        ))}
      </div>
      <div className="public-card insight-note">
        <h2>Important data limitation</h2>
        <p>The source is a static GTFS schedule feed. It describes planned service and does not provide actual bus GPS positions, measured road speeds, real-time arrivals, delays or congestion observations.</p>
        <Link className="inline-link" to="/analytics">View validation results <ArrowUpRight size={16} /></Link>
      </div>
    </PublicPageShell>
  );
}

function DatasetPage() {
  return (
    <PublicPageShell
      eyebrow="RESEARCH / DATASET"
      title={<>Understanding the <em>data.</em></>}
      description="The current research uses a Bengaluru Metropolitan Transport Corporation (BMTC) General Transit Feed Specification dataset."
    >
      <div className="dataset-facts">
        {[
          ["5,063", "Routes inspected"],
          ["69,642", "Trips inspected"],
          ["10,128", "Stops inspected"],
          ["2.23M", "Stop-time records"],
          ["7", "Engineered features"],
          ["5", "K-Means clusters"],
        ].map(([value, label]) => <div className="public-card dataset-fact" key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </div>
      <div className="public-card insight-note">
        <h2>What this dataset can and cannot tell us</h2>
        <p>It can describe scheduled service structure and route-level timetable patterns. It cannot establish real-world congestion, actual bus speeds, current service status or predicted arrival times without additional operational and GPS data.</p>
      </div>
    </PublicPageShell>
  );
}

function NotFoundPage() {
  return (
    <PublicPageShell eyebrow="404 / PAGE NOT FOUND" title={<>This route doesn't <em>exist.</em></>} description="The page may have moved, or the address may be incorrect.">
      <Link className="button-gold" to="/">Return home <ArrowUpRight size={16} /></Link>
    </PublicPageShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <RouterRoute path="/" element={<HomePage />} />
        <RouterRoute path="/routes" element={<BusRoutesPage />} />
        <RouterRoute path="/routes/:routeId" element={<RouteDetailPage />} />
        <RouterRoute path="/compare" element={<ComparePage />} />
        <RouterRoute path="/insights" element={<InsightsPage />} />
        <RouterRoute path="/analytics" element={<PublicPageShell eyebrow="RESEARCH / ANALYTICS" title={<>Explore the <em>model results.</em></>} description="Interactive analysis of the BMTC scheduled-service clustering experiment."><AnalyticsDashboard /></PublicPageShell>} />
        <RouterRoute path="/methodology" element={<MethodologyPage />} />
        <RouterRoute path="/dataset" element={<DatasetPage />} />
        <RouterRoute path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

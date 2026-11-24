
const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

async function apiRequest(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export function getTrafficSummary() {
  return apiRequest("/api/traffic/summary");
}

export function checkBackend() {
  return apiRequest("/api/health");
}

export function getClusters() {
  return apiRequest("/api/clusters");
}

export function getRoutes(params = {}) {
  const query = new URLSearchParams(params);
  return apiRequest(`/api/routes?${query.toString()}`);
}

export function getPCA(limit = 5063) {
  return apiRequest(`/api/analytics/pca?limit=${limit}`);
}

export function getFeatureAnalytics() {
  return apiRequest("/api/analytics/features");
}

export function getModelValidation() {
  return apiRequest("/api/analytics/validation");
}

export function getDatasetInfo() {
  return apiRequest("/api/analytics/dataset");
}

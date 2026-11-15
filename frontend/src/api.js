const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function getTrafficSummary() {
  const response = await fetch(
    `${API_URL}/api/traffic/summary`
  );

  if (!response.ok) {
    throw new Error(`Traffic API request failed: ${response.status}`);
  }

  return response.json();
}

export async function checkBackend() {
  const response = await fetch(
    `${API_URL}/api/health`
  );

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }

  return response.json();
}
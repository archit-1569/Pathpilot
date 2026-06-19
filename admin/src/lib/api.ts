const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pathpilot-admin-token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("pathpilot-admin-token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pathpilot-admin-token");
  }
}

export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (response.status === 401 || response.status === 403) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error(data.detail || "Unauthorized");
  }

  if (!response.ok) {
    throw new Error(data.detail || "API Request Failed");
  }

  return data;
}

import { clearToken, getToken } from "@/lib/auth";

const API_BASE = "/api/v1";

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleUnauthorized() {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function checkResponse(res: Response): Promise<Response> {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export const apiClient = {
  async get(endpoint: string) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: authHeaders({ "Cache-Control": "no-cache", Pragma: "no-cache" }),
      cache: "no-store",
    });
    return (await checkResponse(res)).json();
  },

  async post(endpoint: string, body: Record<string, unknown> | unknown[]) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    return (await checkResponse(res)).json();
  },

  async patch(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const checked = await checkResponse(res);
    if (checked.status === 204) return null;
    return checked.json();
  },

  async delete(endpoint: string) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) { handleUnauthorized(); return; }
    if (!res.ok) throw new Error(await res.text());
  },
};

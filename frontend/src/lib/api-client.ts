const API_BASE = '/api/v1';

export const apiClient = {
  async get(endpoint: string) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  async post(endpoint: string, body: Record<string, unknown> | unknown[]) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async patch(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(endpoint: string) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await res.text());
  }
};

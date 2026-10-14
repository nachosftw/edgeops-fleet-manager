// Thin REST client for the FleetOps API.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function describe(detail) {
  if (Array.isArray(detail)) {
    return detail.map((d) => `${d.loc?.slice(-1)[0] ?? 'field'}: ${d.msg.replace(/^Value error, /, '')}`).join('; ');
  }
  return detail || 'Request failed';
}

export function createApi(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(describe(data.detail), res.status);
    return data;
  }
  return {
    health: () => request('/health'),
    summary: () => request('/fleet/summary'),
    listDevices: () => request('/devices'),
    getDevice: (id) => request(`/devices/${encodeURIComponent(id)}`),
    history: (id) => request(`/devices/${encodeURIComponent(id)}/history`),
    createDevice: (payload) => request('/devices', { method: 'POST', body: payload }),
    updateStatus: (id, status, reason_note) =>
      request(`/devices/${encodeURIComponent(id)}/status`, { method: 'PUT', body: { status, reason_note } }),
    reboot: (id) => request(`/devices/${encodeURIComponent(id)}/reboot`, { method: 'POST' }),
    deleteDevice: (id) => request(`/devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

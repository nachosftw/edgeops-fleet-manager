// Pure helpers shared by the UI. No React imports so they can be unit tested with node:test.

export const STATUSES = ['Online', 'Offline', 'Maintenance'];
export const DEVICE_TYPES = ['Rover', 'Drone', 'Sensor', 'Edge Node', 'Vehicle'];

export function isValidIPv4(value) {
  const parts = String(value).trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d+$/.test(p) && !(p.length > 1 && p[0] === '0') && Number(p) <= 255);
}

export function validateDevice(form) {
  const errors = {};
  const name = (form.name || '').trim();
  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 64) errors.name = 'Name must be 64 characters or fewer';
  if (!DEVICE_TYPES.includes(form.type)) errors.type = 'Choose a device type';
  if (!isValidIPv4(form.ip_address || '')) errors.ip_address = 'Enter a valid IPv4 address, e.g. 192.168.1.10';
  if (!STATUSES.includes(form.status)) errors.status = 'Choose an initial status';
  return errors;
}

export function validateStatusChange(current, next, reason) {
  if (next === current) return `Device is already ${next}`;
  if (next === 'Maintenance' && !(reason || '').trim()) return 'A reason is required for Maintenance';
  return null;
}

export function formatUptime(seconds) {
  if (!seconds || seconds < 60) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function parseDate(value) {
  // the API returns naive UTC timestamps; treat them as UTC
  if (!value) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

export function timeAgo(value, now = Date.now()) {
  const date = parseDate(value);
  if (!date) return '—';
  const s = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function levelOf(percent) {
  if (percent <= 10) return 'critical';
  if (percent < 20) return 'low';
  if (percent < 50) return 'medium';
  return 'good';
}

export function filterDevices(devices, { search = '', status = '', type = '' } = {}) {
  const needle = search.trim().toLowerCase();
  return devices.filter((d) =>
    (!status || d.status === status) &&
    (!type || d.type === type) &&
    (!needle || d.name.toLowerCase().includes(needle) || d.id.toLowerCase().includes(needle) || d.ip_address.includes(needle)),
  );
}

export function parseRoute(hash) {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'devices' && parts[1]) return { page: 'device', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'devices') return { page: 'devices' };
  if (parts[0] === 'settings') return { page: 'settings' };
  return { page: 'dashboard' };
}

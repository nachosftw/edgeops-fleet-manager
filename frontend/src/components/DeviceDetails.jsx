import { useEffect, useState } from 'react';
import { formatUptime, levelOf, timeAgo } from '../lib/utils.js';
import { HealthPill, PageHeader, StatusBadge } from './common.jsx';

function Gauge({ label, value, unit = '%' }) {
  // semicircle gauge
  const r = 70;
  const circumference = Math.PI * r;
  const dash = (value / 100) * circumference;
  return (
    <div className="card gauge" data-testid={`gauge-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="stat-label">{label}</span>
      <svg viewBox="0 0 180 110" width="180" height="110">
        <path d="M20 95 A70 70 0 0 1 160 95" className="gauge-track" />
        <path d="M20 95 A70 70 0 0 1 160 95" className={`gauge-fill level-${levelOf(value)}`}
          strokeDasharray={`${dash} ${circumference}`} />
        <text x="90" y="88" textAnchor="middle" className="gauge-value">{value}{unit}</text>
      </svg>
    </div>
  );
}

const EVENT_LABEL = { REGISTERED: 'Registered', STATUS_CHANGE: 'Status change', REBOOT: 'Reboot', DELETED: 'Deleted' };

export default function DeviceDetails({ id, api, tick, actions }) {
  const [device, setDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getDevice(id), api.history(id)])
      .then(([d, h]) => { if (!cancelled) { setDevice(d); setHistory(h); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, [api, id, tick]);

  if (error) {
    return (
      <div className="card empty-state">
        <h2>Device not found</h2>
        <p className="muted">{error.message}</p>
        <a className="btn" href="#/devices">Back to devices</a>
      </div>
    );
  }
  if (!device) return <p className="muted">Loading device…</p>;

  const meta = [
    ['Device ID', device.id], ['IP address', device.ip_address], ['Type', device.type],
    ['Firmware', `v${device.firmware}`], ['Location', device.location],
    ['Uptime', formatUptime(device.uptime_seconds)], ['Last seen', timeAgo(device.last_seen)],
  ];

  return (
    <>
      <a href="#/devices" className="link back">← All devices</a>
      <PageHeader title={device.name} subtitle={<>
        <StatusBadge status={device.status} /> <HealthPill health={device.health} />
      </>}>
        <button className="btn" onClick={() => actions.open('status', device)}>Update status</button>
        <button className="btn primary" disabled={device.status === 'Offline'}
          title={device.status === 'Offline' ? 'Offline devices cannot be rebooted' : 'Send a remote reboot'}
          onClick={() => actions.reboot(device)}>↻ Reboot</button>
        <button className="btn danger" onClick={() => actions.open('delete', device)}>Delete</button>
      </PageHeader>

      <section className="details-grid">
        <div className="card">
          <h3>Hardware metadata</h3>
          <dl className="meta">
            {meta.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd className={k === 'Device ID' || k === 'IP address' ? 'mono' : ''}>{v}</dd></div>))}
          </dl>
        </div>
        <Gauge label="Battery status" value={device.battery} />
        <Gauge label="Signal strength" value={device.signal_strength} />
      </section>

      <section className="card">
        <h3>Status history</h3>
        <ol className="timeline" data-testid="history">
          {history.map((h) => (
            <li key={h.id}>
              <span className={`tl-dot tl-${h.new_status.toLowerCase()}`} />
              <div>
                <strong>{EVENT_LABEL[h.event] ?? h.event}</strong>
                {h.old_status ? <> · {h.old_status} → {h.new_status}</> : <> · {h.new_status}</>}
                {h.reason_note && <div className="muted">“{h.reason_note}”</div>}
              </div>
              <span className="muted when">{timeAgo(h.changed_at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

import { PageHeader, StatusBadge } from './common.jsx';
import TelemetryChart from './TelemetryChart.jsx';

function Stat({ label, value, tone, hint, testId }) {
  return (
    <div className={`card stat stat-${tone}`} data-testid={testId}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export default function Dashboard({ summary, devices, loading, actions }) {
  if (loading && !summary) return <p className="muted">Loading fleet telemetry…</p>;
  const s = summary ?? { total: 0, online: 0, offline: 0, maintenance: 0, average_battery: 0, availability_pct: 0, alerts: [] };

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live overview of fleet health and telemetry">
        <button className="btn primary" onClick={() => actions.open('add')}>+ Register device</button>
      </PageHeader>

      <section className="stats">
        <Stat label="Total devices" value={s.total} tone="navy" hint={`${s.availability_pct}% available`} testId="stat-total" />
        <Stat label="Online" value={s.online} tone="online" testId="stat-online" />
        <Stat label="Offline" value={s.offline} tone="offline" testId="stat-offline" />
        <Stat label="Maintenance" value={s.maintenance} tone="maintenance" testId="stat-maintenance" />
        <Stat label="Avg. battery" value={`${s.average_battery}%`} tone="cyan" testId="stat-battery" />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Telemetry by device</h3>
            <div className="legend">
              <span><i className="sw sw-battery" />Battery</span>
              <span><i className="sw sw-signal" />Signal</span>
            </div>
          </div>
          <TelemetryChart devices={devices} />
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Active alerts</h3>
            <span className="count">{s.alerts.length}</span>
          </div>
          {s.alerts.length === 0 ? (
            <p className="muted">No active alerts. All devices are healthy.</p>
          ) : (
            <ul className="alerts" data-testid="alerts">
              {s.alerts.map((a, i) => (
                <li key={i} className={`alert alert-${a.severity}`}>
                  <span className="alert-dot" />
                  <div>
                    <a href={`#/devices/${a.device_id}`}><strong>{a.device_name}</strong></a>
                    <span className="muted"> · {a.device_id}</span>
                    <div>{a.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Fleet at a glance</h3>
          <a href="#/devices" className="link">View all devices →</a>
        </div>
        <div className="chips">
          {devices.map((d) => (
            <a key={d.id} href={`#/devices/${d.id}`} className="chip">
              <span className="chip-name">{d.name}</span>
              <StatusBadge status={d.status} />
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

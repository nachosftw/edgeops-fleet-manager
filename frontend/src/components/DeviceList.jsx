import { useState } from 'react';
import { DEVICE_TYPES, STATUSES, filterDevices } from '../lib/utils.js';
import { HealthPill, Meter, PageHeader, StatusBadge } from './common.jsx';

export default function DeviceList({ devices, loading, actions }) {
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });
  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });
  const rows = filterDevices(devices, filters);

  return (
    <>
      <PageHeader title="Devices" subtitle={`${devices.length} registered assets`}>
        <button className="btn primary" onClick={() => actions.open('add')}>+ Register device</button>
      </PageHeader>

      <div className="card">
        <div className="toolbar">
          <input
            className="input search"
            placeholder="Search by name, ID or IP…"
            value={filters.search}
            onChange={set('search')}
            aria-label="Search devices"
          />
          <select className="input" value={filters.status} onChange={set('status')} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.type} onChange={set('type')} aria-label="Filter by type">
            <option value="">All types</option>
            {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="table-wrap">
          <table className="table" data-testid="device-table">
            <thead>
              <tr>
                <th>Device ID</th><th>Name</th><th>Type</th><th>IP address</th>
                <th>Status</th><th>Battery</th><th>Health</th><th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.id}</td>
                  <td><a href={`#/devices/${d.id}`} className="strong">{d.name}</a></td>
                  <td>{d.type}</td>
                  <td className="mono">{d.ip_address}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td><Meter value={d.battery} label="Battery" /></td>
                  <td><HealthPill health={d.health} /></td>
                  <td className="right actions">
                    <a className="btn small" href={`#/devices/${d.id}`}>View</a>
                    <button className="btn small" onClick={() => actions.open('status', d)}>Status</button>
                    <button className="btn small danger" onClick={() => actions.open('delete', d)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="empty">No devices match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

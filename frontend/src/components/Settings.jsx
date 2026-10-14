import { useState } from 'react';
import { createApi } from '../lib/api.js';
import { PageHeader } from './common.jsx';

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [check, setCheck] = useState(null);

  async function testConnection() {
    setCheck({ state: 'pending', text: 'Checking…' });
    try {
      const res = await createApi(form.apiBaseUrl).health();
      setCheck({ state: 'ok', text: `Connected · API v${res.version}` });
    } catch {
      setCheck({ state: 'fail', text: 'Could not reach the API at this URL' });
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="System configuration for this browser" />
      <form className="card form settings" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <h3>Backend gateway</h3>
        <label>API base URL
          <div className="inline">
            <input className="input mono" value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })} />
            <button type="button" className="btn" onClick={testConnection}>Test connection</button>
          </div>
          <span className="muted">Use <code>/api/v1</code> behind the bundled proxy, or e.g. <code>http://localhost:5000/api/v1</code>.</span>
          {check && <span className={`check check-${check.state}`} data-testid="connection-check">{check.text}</span>}
        </label>

        <h3>Telemetry</h3>
        <label>Refresh rate
          <select className="input" value={form.refreshSeconds}
            onChange={(e) => setForm({ ...form, refreshSeconds: Number(e.target.value) })}>
            <option value={5}>Every 5 seconds</option>
            <option value={10}>Every 10 seconds</option>
            <option value={30}>Every 30 seconds</option>
            <option value={0}>Manual (off)</option>
          </select>
        </label>

        <h3>Appearance</h3>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {['light', 'dark'].map((t) => (
            <button type="button" key={t} role="radio" aria-checked={form.theme === t}
              className={form.theme === t ? 'active' : ''} onClick={() => setForm({ ...form, theme: t })}>
              {t === 'light' ? '☀ Light' : '☾ Dark'}
            </button>
          ))}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn primary">Save settings</button>
        </div>
      </form>
    </>
  );
}

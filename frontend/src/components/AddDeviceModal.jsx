import { useState } from 'react';
import { DEVICE_TYPES, STATUSES, validateDevice } from '../lib/utils.js';
import { Modal } from './common.jsx';

const EMPTY = { name: '', type: 'Rover', ip_address: '', location: '', status: 'Online' };

export default function AddDeviceModal({ onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const found = validateDevice(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setServerError(null);
    try {
      await onSubmit({ ...form, location: form.location.trim() || 'Unassigned' });
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Register new device" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="add-device" className="btn primary" disabled={busy}>
        {busy ? 'Registering…' : 'Register device'}
      </button>
    </>}>
      <form id="add-device" onSubmit={submit} noValidate className="form">
        <label>Device name
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Rover-Theta" autoFocus />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>
        <div className="row">
          <label>Device type
            <select className="input" value={form.type} onChange={set('type')}>
              {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>IP address
            <input className="input mono" value={form.ip_address} onChange={set('ip_address')} placeholder="192.168.1.50" />
            {errors.ip_address && <span className="field-error">{errors.ip_address}</span>}
          </label>
        </div>
        <label><span>Location <span className="muted">(optional)</span></span>
          <input className="input" value={form.location} onChange={set('location')} placeholder="e.g. Depot A" />
        </label>
        <fieldset className="radios">
          <legend>Initial status</legend>
          {STATUSES.map((s) => (
            <label key={s} className="radio">
              <input type="radio" name="status" value={s} checked={form.status === s} onChange={set('status')} /> {s}
            </label>
          ))}
        </fieldset>
        {serverError && <div className="form-error" role="alert">{serverError}</div>}
      </form>
    </Modal>
  );
}

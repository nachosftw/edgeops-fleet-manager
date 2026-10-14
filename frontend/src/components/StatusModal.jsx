import { useState } from 'react';
import { STATUSES, validateStatusChange } from '../lib/utils.js';
import { Modal, StatusBadge } from './common.jsx';

export default function StatusModal({ device, onClose, onSubmit }) {
  const [status, setStatus] = useState(STATUSES.find((s) => s !== device.status));
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const problem = validateStatusChange(device.status, status, reason);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await onSubmit(device, status, reason.trim());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Update status · ${device.name}`} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="submit" form="status-form" className="btn primary" disabled={busy}>Confirm change</button>
    </>}>
      <form id="status-form" onSubmit={submit} className="form">
        <p className="muted">Current status: <StatusBadge status={device.status} /></p>
        <fieldset className="radios stacked">
          <legend>New status</legend>
          {STATUSES.map((s) => (
            <label key={s} className={`radio-card ${status === s ? 'selected' : ''}`}>
              <input type="radio" name="new-status" value={s} checked={status === s} onChange={() => setStatus(s)} />
              <StatusBadge status={s} />
              {s === device.status && <span className="muted">(current)</span>}
            </label>
          ))}
        </fieldset>
        <label>Reason for change {status === 'Maintenance' ? <span className="req">required</span> : <span className="muted">(optional)</span>}
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Scheduled firmware upgrade" />
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}

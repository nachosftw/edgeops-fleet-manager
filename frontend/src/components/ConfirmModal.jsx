import { useState } from 'react';
import { Modal } from './common.jsx';

export default function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm }) {
  const [error, setError] = useState(null);
  async function confirm() {
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn danger solid" onClick={confirm}>{confirmLabel}</button>
    </>}>
      <p>{message}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
    </Modal>
  );
}

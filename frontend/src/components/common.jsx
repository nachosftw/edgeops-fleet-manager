import { levelOf } from '../lib/utils.js';

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}

export function HealthPill({ health }) {
  return <span className={`health health-${health.toLowerCase()}`}>{health}</span>;
}

export function Meter({ value, label }) {
  return (
    <div className="meter" title={`${label ?? ''} ${value}%`}>
      <div className="meter-track">
        <div className={`meter-fill level-${levelOf(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className="meter-value">{value}%</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      <div className="header-actions">{children}</div>
    </header>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

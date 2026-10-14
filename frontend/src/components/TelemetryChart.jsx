// Grouped horizontal bars: battery and signal strength per device (SVG, no chart library).
export default function TelemetryChart({ devices }) {
  if (!devices.length) return <p className="muted">No devices registered yet.</p>;
  const rowH = 34;
  const labelW = 120;
  const width = 520;
  const plotW = width - labelW - 44;
  const height = devices.length * rowH + 24;
  const x = (v) => labelW + (v / 100) * plotW;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Battery and signal per device">
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={0} y2={height - 20} className="gridline" />
          <text x={x(t)} y={height - 6} className="tick" textAnchor="middle">{t}%</text>
        </g>
      ))}
      {devices.map((d, i) => {
        const y = i * rowH + 6;
        return (
          <g key={d.id}>
            <text x={labelW - 10} y={y + 15} className="bar-label" textAnchor="end">{d.name}</text>
            <rect x={labelW} y={y + 2} width={Math.max(2, (d.battery / 100) * plotW)} height={10} rx={3} className="bar-battery" />
            <rect x={labelW} y={y + 14} width={Math.max(2, (d.signal_strength / 100) * plotW)} height={10} rx={3} className="bar-signal" />
            <text x={x(d.battery) + 6} y={y + 11} className="bar-value">{d.battery}</text>
            <text x={x(d.signal_strength) + 6} y={y + 23} className="bar-value">{d.signal_strength}</text>
          </g>
        );
      })}
    </svg>
  );
}

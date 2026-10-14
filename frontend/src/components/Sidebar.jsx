const NAV = [
  { page: 'dashboard', href: '#/', label: 'Dashboard', icon: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z' },
  { page: 'devices', href: '#/devices', label: 'Devices', icon: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z' },
  { page: 'settings', href: '#/settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zm8.9 5l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L16.4 5h-4l-.4 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.4 2.6h4l.4-2.6a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6a7 7 0 000-2z' },
];

export default function Sidebar({ page, online }) {
  const active = page === 'device' ? 'devices' : page;
  return (
    <aside className="sidebar">
      <a className="brand" href="#/">
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="#132E52" />
          <path d="M7 21l6-10 4 6 3-4 5 8z" fill="#22D3EE" />
        </svg>
        <span>FleetOps</span>
      </a>
      <nav>
        {NAV.map((item) => (
          <a key={item.page} href={item.href} className={active === item.page ? 'nav-link active' : 'nav-link'}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={item.icon} fill="currentColor" /></svg>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="api-status" data-testid="api-status">
        <span className={`dot ${online === false ? 'down' : online ? 'up' : ''}`} />
        {online === false ? 'API unreachable' : online ? 'API connected' : 'Connecting…'}
      </div>
    </aside>
  );
}

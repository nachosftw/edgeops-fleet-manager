import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApi } from './lib/api.js';
import { loadSettings, saveSettings } from './lib/settings.js';
import { parseRoute } from './lib/utils.js';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import DeviceList from './components/DeviceList.jsx';
import DeviceDetails from './components/DeviceDetails.jsx';
import Settings from './components/Settings.jsx';
import AddDeviceModal from './components/AddDeviceModal.jsx';
import StatusModal from './components/StatusModal.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [online, setOnline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {kind:'add'|'status'|'delete', device}
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);

  const api = useMemo(() => createApi(settings.apiBaseUrl), [settings.apiBaseUrl]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.listDevices(), api.summary()]);
      setDevices(list);
      setSummary(sum);
      setOnline(true);
      setTick((t) => t + 1);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
    if (!settings.refreshSeconds) return undefined;
    const id = setInterval(refresh, settings.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [refresh, settings.refreshSeconds]);

  const notify = (message, kind = 'success') => setToast({ message, kind, at: Date.now() });

  const actions = {
    open: (kind, device) => setModal({ kind, device }),
    async reboot(device) {
      try {
        await api.reboot(device.id);
        notify(`Reboot issued to ${device.name}`);
        refresh();
      } catch (err) {
        notify(err.message, 'error');
      }
    },
  };

  async function handleCreate(form) {
    const created = await api.createDevice(form);
    setModal(null);
    notify(`${created.name} registered as ${created.id}`);
    refresh();
  }

  async function handleStatus(device, status, reason) {
    await api.updateStatus(device.id, status, reason);
    setModal(null);
    notify(`${device.name} is now ${status}`);
    refresh();
  }

  async function handleDelete(device) {
    await api.deleteDevice(device.id);
    setModal(null);
    notify(`${device.name} removed from the fleet`);
    if (route.page === 'device') window.location.hash = '#/devices';
    refresh();
  }

  function handleSaveSettings(next) {
    setSettings(next);
    saveSettings(next);
    notify('Settings saved');
  }

  let page;
  if (route.page === 'devices') {
    page = <DeviceList devices={devices} loading={loading} actions={actions} />;
  } else if (route.page === 'device') {
    page = <DeviceDetails id={route.id} api={api} tick={tick} actions={actions} />;
  } else if (route.page === 'settings') {
    page = <Settings settings={settings} api={api} onSave={handleSaveSettings} />;
  } else {
    page = <Dashboard summary={summary} devices={devices} loading={loading} actions={actions} />;
  }

  return (
    <div className="shell">
      <Sidebar page={route.page} online={online} />
      <main className="main">
        {online === false && (
          <div className="banner" role="alert">
            Cannot reach the FleetOps API at <code>{settings.apiBaseUrl}</code>. Check the backend container or Settings.
          </div>
        )}
        {page}
      </main>
      {modal?.kind === 'add' && <AddDeviceModal onClose={() => setModal(null)} onSubmit={handleCreate} />}
      {modal?.kind === 'status' && (
        <StatusModal device={modal.device} onClose={() => setModal(null)} onSubmit={handleStatus} />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal
          title={`Remove ${modal.device.name}?`}
          message={`${modal.device.id} will be removed from the active fleet registry. Its audit history is kept.`}
          confirmLabel="Remove device"
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.device)}
        />
      )}
      {toast && <Toast key={toast.at} {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}

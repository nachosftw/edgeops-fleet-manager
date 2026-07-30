import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  const [devices, setDevices] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Online');

  // Base URL pointing to port 5000 (backend)
  // To this:
  const API_URL = 'https://organic-space-sniffle-69w9gr75pwjgfr6-5000.app.github.dev/api/devices';

  const fetchDevices = () => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setDevices(data))
      .catch((err) => console.error("Error fetching devices:", err));
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = (e) => {
    e.preventDefault();
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status }),
    })
      .then((res) => res.json())
      .then(() => {
        setName('');
        fetchDevices();
      });
  };

  const handleDeleteDevice = (id) => {
    fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    })
      .then((res) => res.json())
      .then(() => fetchDevices());
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Fleet Manager (In-Memory)</h2>

      <form onSubmit={handleAddDevice} style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Device Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ marginRight: '8px', padding: '6px' }}
        />
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
          style={{ marginRight: '8px', padding: '6px' }}
        >
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
        <button type="submit" style={{ padding: '6px 12px' }}>Add Device</button>
      </form>

      <h3>Device List</h3>
      <ul>
        {devices.map((dev) => (
          <li key={dev.id} style={{ marginBottom: '8px' }}>
            <strong>{dev.name}</strong> - <em>{dev.status}</em>{' '}
            <button 
              onClick={() => handleDeleteDevice(dev.id)}
              style={{ marginLeft: '10px', color: 'red' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
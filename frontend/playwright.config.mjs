// End-to-end (system integration) tests: real browser -> React SPA -> dev proxy -> FastAPI -> SQLite.
// Starts its own isolated backend (fresh SQLite file, demo seed) and frontend on spare ports.
import { defineConfig, devices } from '@playwright/test';

const PY = process.env.PYTHON || 'python';
const API_PORT = 5055;
const WEB_PORT = 3055;

// fresh file-backed SQLite DB per run (an in-memory DB shares one connection across
// uvicorn worker threads, which corrupts cursors under concurrent requests)
const DB_FILE = 'e2e-fleet.db';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: `${PY} -c "import os; os.path.exists('${DB_FILE}') and os.remove('${DB_FILE}')" && ${PY} -m uvicorn main:app --port ${API_PORT}`,
      cwd: '../backend',
      env: { DATABASE_URL: `sqlite:///./${DB_FILE}`, SEED_DEMO_DATA: 'true' },
      url: `http://localhost:${API_PORT}/api/v1/health`,
      reuseExistingServer: false,
    },
    {
      command: 'node build.mjs --serve',
      env: { PORT: String(WEB_PORT), API_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
});

// Application Entrypoint
import { initScene } from './three/scene.js';
import { initRouter } from './router.js';
import { configureChartDefaults } from './charts.js';
import { api } from './api.js';
import { state, updateState, getTheme, setTheme } from './state.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Theme
  const currentTheme = getTheme();
  setTheme(currentTheme);
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      themeToggleBtn.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    });
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }

  // 2. Initialize 3D Scene
  const canvas = document.getElementById('bg-canvas');
  initScene(canvas);

  // 3. Configure Chart.js Dark Mode defaults
  configureChartDefaults();

  // 4. Initialize Topbar Controls
  const plantSelect = document.getElementById('topbar-plant-select');
  if (plantSelect) {
    plantSelect.value = state.plantId;
    plantSelect.addEventListener('change', (e) => {
      const pid = parseInt(e.target.value, 10);
      const name = pid === 4136001 ? 'Plant 2' : 'Plant 1';
      updateState({ plantId: pid, plantName: name });
    });
  }

  const tariffInput = document.getElementById('topbar-tariff-input');
  if (tariffInput) {
    tariffInput.value = state.tariff;
    tariffInput.addEventListener('change', (e) => {
      const t = parseFloat(e.target.value) || 6.0;
      updateState({ tariff: t });
    });
  }

  // 5. Check API Status Dot
  const statusDot = document.getElementById('api-status-dot');
  const statusText = document.getElementById('api-status-text');
  try {
    const health = await api.getHealth();
    if (health && health.status === 'ok') {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'API Online';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'API Degraded';
    }
  } catch (err) {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'API Offline';
  }

  // 6. Start Router
  initRouter();
});

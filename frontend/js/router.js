// Client-side Hash Router
import { setMode } from './three/scene.js';

const routes = {
  '#/': {
    title: 'SolarIQ — Solar Generation Intelligence',
    mode: 'home',
    loader: () => import('./pages/home.js'),
  },
  '#/prediction': {
    title: 'SolarIQ — Generation Prediction',
    mode: 'prediction',
    loader: () => import('./pages/prediction.js'),
  },
  '#/anomaly': {
    title: 'SolarIQ — Anomaly Detection',
    mode: 'anomaly',
    loader: () => import('./pages/anomaly.js'),
  },
  '#/weather': {
    title: 'SolarIQ — Weather Driver Analysis',
    mode: 'weather',
    loader: () => import('./pages/weather.js'),
  },
  '#/historical': {
    title: 'SolarIQ — Historical Time-Series',
    mode: 'historical',
    loader: () => import('./pages/historical.js'),
  },
  '#/performance': {
    title: 'SolarIQ — Model Performance Benchmarks',
    mode: 'performance',
    loader: () => import('./pages/performance.js'),
  },
  '#/financial': {
    title: 'SolarIQ — Financial Impact Estimation',
    mode: 'financial',
    loader: () => import('./pages/financial.js'),
  },
};

export async function handleRoute() {
  const hash = window.location.hash || '#/';
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const route = routes[hash] || {
    title: 'SolarIQ — Page Not Found',
    mode: 'other',
    loader: null,
  };

  document.title = route.title;
  setMode(route.mode || 'other');

  // Update active navigation state
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (!route.loader) {
    appContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 60px 20px;">
        <h2 style="font-size: 40px; margin-bottom: 12px;">404</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px;">The requested page could not be found.</p>
        <a href="#/" class="btn btn-primary">Return Home</a>
      </div>
    `;
    return;
  }

  try {
    const pageModule = await route.loader();
    await pageModule.render(appContainer);
  } catch (err) {
    appContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: var(--red); margin-bottom: 8px;">Error Loading Page</h3>
        <p style="color: var(--text-muted); font-size: 13px;">${err.message}</p>
      </div>
    `;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

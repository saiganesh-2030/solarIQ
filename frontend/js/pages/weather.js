// Page 3: Weather Driver Analysis
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, renderErrorCard } from '../ui.js';
import { createScatterChart, createLineChart, createHorizontalBarChart } from '../charts.js';
import { setMode } from '../three/scene.js';

let weatherData = null;
let scatterIrradChart = null;
let scatterModChart = null;
let scatterAmbChart = null;
let hourlyChart = null;
let fiChart = null;

export async function render(container) {
  setMode('weather');

  container.innerHTML = `
    <div class="page-enter">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Weather Driver Analysis</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Explore correlation dynamics and non-linear relationships between atmospheric conditions and power generation.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <label class="form-label" for="weather-plant-filter" style="margin: 0;">Plant Scope:</label>
          <select id="weather-plant-filter" class="form-select" style="width: 160px; padding: 6px 12px;">
            <option value="all" selected>All Facilities</option>
            <option value="Plant 1">Plant 1 (4135001)</option>
            <option value="Plant 2">Plant 2 (4136001)</option>
          </select>
        </div>
      </div>

      <!-- Visible Scientific Notice Box -->
      <div class="notice-box" style="margin-bottom: 24px; border-left-color: var(--amber);">
        <span>⚠️</span> <strong>Association Notice:</strong> These patterns show empirical association, not proof of cause. Solar cell operating temperature is both driven by and an attenuator of photovoltaic efficiency.
      </div>

      <!-- Top Row: Correlation Matrix Heatmap & Feature Importance -->
      <div class="grid-2col" style="margin-bottom: 28px;">
        <!-- Correlation Heatmap -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Cross-Correlation Matrix</h2>
              <p class="card-subtitle" id="heatmap-subtitle">Pairwise Pearson correlation coefficients</p>
            </div>
          </div>
          <div id="heatmap-container" class="heatmap-container">
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading correlation matrix...</div>
          </div>
          <div class="chart-takeaway" id="heatmap-takeaway">
            Calculating correlation strength...
          </div>
        </div>

        <!-- Feature Importance Horizontal Bar Chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Random Forest Feature Importance</h2>
              <p class="card-subtitle">Gini impurity reduction across all ensemble trees</p>
            </div>
          </div>
          <div style="height: 220px; position: relative;">
            <canvas id="fi-chart"></canvas>
          </div>
          <div class="chart-takeaway" id="fi-takeaway">
            Calculating feature contributions...
          </div>
        </div>
      </div>

      <!-- Diurnal Generation Profiles (Both Plants) -->
      <div class="card" style="margin-bottom: 28px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">Hourly Generation Profile by Plant</h2>
            <p class="card-subtitle">Mean AC power output for each hour of the day (00:00 to 23:00)</p>
          </div>
        </div>
        <div style="height: 250px; position: relative;">
          <canvas id="hourly-profile-chart"></canvas>
        </div>
        <div class="chart-takeaway" id="hourly-takeaway">
          Analyzing diurnal peaks...
        </div>
      </div>

      <!-- Scatter Plots Grid (3 Charts) -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">Weather vs. AC Generation Scatter Samples</h2>
        <p style="color: var(--text-muted); font-size: 13px;">Historical sample points showing power response to individual drivers.</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        <!-- Scatter 1: Irradiation vs AC Power -->
        <div class="card">
          <h3 class="card-title" style="font-size: 14px;">Irradiation vs AC Power</h3>
          <p class="card-subtitle" style="font-size: 11px;">kW/m² vs AC kW output</p>
          <div style="height: 220px; position: relative; margin-top: 12px;">
            <canvas id="scatter-irrad-chart"></canvas>
          </div>
          <div class="chart-takeaway" id="scatter-irrad-takeaway">
            Calculating relationship...
          </div>
        </div>

        <!-- Scatter 2: Module Temperature vs AC Power -->
        <div class="card">
          <h3 class="card-title" style="font-size: 14px;">Module Temp vs AC Power</h3>
          <p class="card-subtitle" style="font-size: 11px;">Module surface °C vs AC kW output</p>
          <div style="height: 220px; position: relative; margin-top: 12px;">
            <canvas id="scatter-mod-chart"></canvas>
          </div>
          <div class="chart-takeaway" id="scatter-mod-takeaway">
            Calculating relationship...
          </div>
        </div>

        <!-- Scatter 3: Ambient Temperature vs AC Power -->
        <div class="card">
          <h3 class="card-title" style="font-size: 14px;">Ambient Temp vs AC Power</h3>
          <p class="card-subtitle" style="font-size: 11px;">Ambient air °C vs AC kW output</p>
          <div style="height: 220px; position: relative; margin-top: 12px;">
            <canvas id="scatter-amb-chart"></canvas>
          </div>
          <div class="chart-takeaway" id="scatter-amb-takeaway">
            Calculating relationship...
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    weatherData = await api.getWeatherAnalysis();
    setupWeatherPage(container);
  } catch (err) {
    container.innerHTML = renderErrorCard(
      `Failed to load weather analysis: ${err.message}`,
      "window.location.reload"
    );
  }
}

function setupWeatherPage(container) {
  const filterSelect = container.querySelector('#weather-plant-filter');

  function updateAll() {
    const scope = filterSelect.value;
    renderHeatmap(scope);
    renderFeatureImportance(scope);
    renderHourlyProfile(scope);
    renderScatters(scope);
  }

  filterSelect.addEventListener('change', updateAll);
  updateAll();
}

function getCorrColor(val) {
  // val from -1 to 1. Solar correlations are predominantly 0 to 1.
  const abs = Math.abs(val);
  if (abs >= 0.9) return 'rgba(240, 136, 62, 0.45)';
  if (abs >= 0.7) return 'rgba(242, 204, 96, 0.35)';
  if (abs >= 0.4) return 'rgba(88, 166, 255, 0.25)';
  return 'rgba(255, 255, 255, 0.05)';
}

function renderHeatmap(scope) {
  const container = document.getElementById('heatmap-container');
  const takeaway = document.getElementById('heatmap-takeaway');
  if (!container || !weatherData?.correlation_by_plant) return;

  const plantKey = scope === 'Plant 2' ? 'Plant 2' : 'Plant 1';
  const matrix = weatherData.correlation_by_plant[plantKey] || {};
  const vars = ['AC_POWER', 'IRRADIATION', 'MODULE_TEMPERATURE', 'AMBIENT_TEMPERATURE'];
  const labels = {
    AC_POWER: 'AC Power',
    IRRADIATION: 'Irradiation',
    MODULE_TEMPERATURE: 'Module Temp',
    AMBIENT_TEMPERATURE: 'Ambient Temp',
  };

  let html = '<table class="heatmap-table"><thead><tr><th></th>';
  vars.forEach((v) => {
    html += `<th>${labels[v]}</th>`;
  });
  html += '</tr></thead><tbody>';

  vars.forEach((rowVar) => {
    html += `<tr><th style="text-align: right; padding-right: 10px;">${labels[rowVar]}</th>`;
    vars.forEach((colVar) => {
      const val = matrix[rowVar]?.[colVar] ?? 0;
      const bg = getCorrColor(val);
      html += `
        <td>
          <div class="heatmap-cell" style="background: ${bg};" title="${labels[rowVar]} vs ${labels[colVar]}: r = ${val.toFixed(4)}">
            <span>${val.toFixed(3)}</span>
          </div>
        </td>
      `;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  // Dynamic takeaway
  const irradCorr = matrix['AC_POWER']?.['IRRADIATION'] ?? 0.99;
  if (takeaway) {
    takeaway.textContent = `Irradiation has the strongest correlation with AC output in ${plantKey} (r = ${irradCorr.toFixed(4)}).`;
  }
}

function renderFeatureImportance(scope) {
  const canvas = document.getElementById('fi-chart');
  const takeaway = document.getElementById('fi-takeaway');
  if (!canvas || !weatherData?.feature_importance) return;

  const fiData = weatherData.feature_importance;
  const labels = ['Irradiation', 'Module Temp', 'Ambient Temp'];

  let datasets = [];
  if (scope === 'all') {
    datasets = [
      {
        label: 'Plant 1',
        data: [
          (fiData['Plant 1']?.IRRADIATION ?? 0) * 100,
          (fiData['Plant 1']?.MODULE_TEMPERATURE ?? 0) * 100,
          (fiData['Plant 1']?.AMBIENT_TEMPERATURE ?? 0) * 100,
        ],
        backgroundColor: '#58a6ff',
      },
      {
        label: 'Plant 2',
        data: [
          (fiData['Plant 2']?.IRRADIATION ?? 0) * 100,
          (fiData['Plant 2']?.MODULE_TEMPERATURE ?? 0) * 100,
          (fiData['Plant 2']?.AMBIENT_TEMPERATURE ?? 0) * 100,
        ],
        backgroundColor: '#f0883e',
      },
    ];
  } else {
    const pKey = scope;
    datasets = [
      {
        label: pKey,
        data: [
          (fiData[pKey]?.IRRADIATION ?? 0) * 100,
          (fiData[pKey]?.MODULE_TEMPERATURE ?? 0) * 100,
          (fiData[pKey]?.AMBIENT_TEMPERATURE ?? 0) * 100,
        ],
        backgroundColor: pKey === 'Plant 1' ? '#58a6ff' : '#f0883e',
      },
    ];
  }

  if (fiChart) fiChart.destroy();
  fiChart = createHorizontalBarChart(canvas.getContext('2d'), labels, datasets, {
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (v) => v + '%',
        },
      },
    },
  });

  const p1Irrad = ((fiData['Plant 1']?.IRRADIATION ?? 0.99) * 100).toFixed(1);
  if (takeaway) {
    takeaway.textContent = `Irradiation accounts for over ${p1Irrad}% of model predictive weighting across both facilities.`;
  }
}

function renderHourlyProfile(scope) {
  const canvas = document.getElementById('hourly-profile-chart');
  const takeaway = document.getElementById('hourly-takeaway');
  if (!canvas || !weatherData?.hourly_avg) return;

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const rawList = weatherData.hourly_avg;

  const p1Data = hours.map((_, h) => {
    const item = rawList.find((d) => d.PLANT === 'Plant 1' && d.HOUR === h);
    return item ? item.AC_POWER : 0;
  });

  const p2Data = hours.map((_, h) => {
    const item = rawList.find((d) => d.PLANT === 'Plant 2' && d.HOUR === h);
    return item ? item.AC_POWER : 0;
  });

  const datasets = [];
  if (scope === 'all' || scope === 'Plant 1') {
    datasets.push({
      label: 'Plant 1 (Avg kW)',
      data: p1Data,
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88, 166, 255, 0.1)',
      fill: true,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 2,
    });
  }
  if (scope === 'all' || scope === 'Plant 2') {
    datasets.push({
      label: 'Plant 2 (Avg kW)',
      data: p2Data,
      borderColor: '#f0883e',
      backgroundColor: 'rgba(240, 136, 62, 0.1)',
      fill: true,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 2,
    });
  }

  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = createLineChart(canvas.getContext('2d'), hours, datasets, {
    scales: {
      x: {
        ticks: { maxTicksLimit: 12 },
      },
      y: {
        beginAtZero: true,
      },
    },
  });

  const maxP1 = Math.round(Math.max(...p1Data));
  if (takeaway) {
    takeaway.textContent = `Diurnal curve peaks at 12:00–13:00 with Plant 1 averaging ~${maxP1.toLocaleString()} kW during midday sun.`;
  }
}

function renderScatters(scope) {
  if (!weatherData?.scatter_sample) return;

  const samples = weatherData.scatter_sample;
  const filtered = scope === 'all' ? samples : samples.filter((s) => s.PLANT === scope);

  function createPoints(xKey) {
    if (scope === 'all') {
      return [
        {
          label: 'Plant 1',
          data: filtered
            .filter((s) => s.PLANT === 'Plant 1')
            .map((s) => ({ x: s[xKey], y: s.AC_POWER })),
          backgroundColor: 'rgba(88, 166, 255, 0.6)',
          pointRadius: 3,
        },
        {
          label: 'Plant 2',
          data: filtered
            .filter((s) => s.PLANT === 'Plant 2')
            .map((s) => ({ x: s[xKey], y: s.AC_POWER })),
          backgroundColor: 'rgba(240, 136, 62, 0.6)',
          pointRadius: 3,
        },
      ];
    }
    return [
      {
        label: scope,
        data: filtered.map((s) => ({ x: s[xKey], y: s.AC_POWER })),
        backgroundColor: scope === 'Plant 1' ? 'rgba(88, 166, 255, 0.6)' : 'rgba(240, 136, 62, 0.6)',
        pointRadius: 3,
      },
    ];
  }

  // 1. Irradiation Scatter
  const c1 = document.getElementById('scatter-irrad-chart');
  if (c1) {
    if (scatterIrradChart) scatterIrradChart.destroy();
    scatterIrradChart = createScatterChart(c1.getContext('2d'), createPoints('IRRADIATION'), {
      scales: {
        x: { title: { display: true, text: 'Irradiation (kW/m²)', color: '#8b949e' } },
        y: { title: { display: true, text: 'AC Power (kW)', color: '#8b949e' }, beginAtZero: true },
      },
    });
    document.getElementById('scatter-irrad-takeaway').textContent =
      'Direct near-linear scaling between solar irradiance and electrical generation.';
  }

  // 2. Module Temp Scatter
  const c2 = document.getElementById('scatter-mod-chart');
  if (c2) {
    if (scatterModChart) scatterModChart.destroy();
    scatterModChart = createScatterChart(c2.getContext('2d'), createPoints('MODULE_TEMPERATURE'), {
      scales: {
        x: { title: { display: true, text: 'Module Temp (°C)', color: '#8b949e' } },
        y: { title: { display: true, text: 'AC Power (kW)', color: '#8b949e' }, beginAtZero: true },
      },
    });
    document.getElementById('scatter-mod-takeaway').textContent =
      'High module temperature correlates with peak hours, but introduces thermal derating curvature.';
  }

  // 3. Ambient Temp Scatter
  const c3 = document.getElementById('scatter-amb-chart');
  if (c3) {
    if (scatterAmbChart) scatterAmbChart.destroy();
    scatterAmbChart = createScatterChart(c3.getContext('2d'), createPoints('AMBIENT_TEMPERATURE'), {
      scales: {
        x: { title: { display: true, text: 'Ambient Temp (°C)', color: '#8b949e' } },
        y: { title: { display: true, text: 'AC Power (kW)', color: '#8b949e' }, beginAtZero: true },
      },
    });
    document.getElementById('scatter-amb-takeaway').textContent =
      'Ambient air temperature exhibits positive correlation with time of day and secondary output linkage.';
  }
}

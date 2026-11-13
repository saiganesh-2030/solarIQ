// Page 1: Solar Power Prediction
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, animateCountUp, formatKw, renderErrorCard } from '../ui.js';
import { createLineChart } from '../charts.js';
import { setMode, setSunHour, setPower } from '../three/scene.js';

let typicalDayCache = {};
let typicalChart = null;
let debounceTimer = null;

export async function render(container) {
  setMode('prediction');

  const selectedPlant = state.get('selectedPlant') || 4135001;
  const initialPlantId = (selectedPlant === 'all' || !selectedPlant) ? 4135001 : Number(selectedPlant);

  container.innerHTML = `
    <div class="page-enter">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Solar Power Prediction</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Forecast instantaneous AC power based on meteorological drivers.</p>
      </div>

      <div class="grid-2col">
        <!-- Input Form Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Weather & Time Inputs</h2>
              <p class="card-subtitle">Adjust atmospheric readings or pick typical conditions</p>
            </div>
          </div>

          <form id="prediction-form" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label" for="pred-plant">Solar Facility</label>
              <select id="pred-plant" class="form-select">
                <option value="4135001" ${initialPlantId === 4135001 ? 'selected' : ''}>Plant 1 (ID: 4135001)</option>
                <option value="4136001" ${initialPlantId === 4136001 ? 'selected' : ''}>Plant 2 (ID: 4136001)</option>
              </select>
            </div>

            <!-- Irradiation -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="pred-irrad" style="margin: 0;">Solar Irradiation (kW/m²)</label>
                <input type="number" id="pred-irrad-num" class="form-control" style="width: 80px; padding: 4px 8px; text-align: right; font-family: var(--font-mono);" min="0" max="1.2" step="0.01" value="0.75">
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="pred-irrad" class="range-slider" min="0" max="1.2" step="0.01" value="0.75">
                <span class="range-val" id="pred-irrad-val">0.75</span>
              </div>
            </div>

            <!-- Ambient Temp -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="pred-amb" style="margin: 0;">Ambient Temperature (°C)</label>
                <input type="number" id="pred-amb-num" class="form-control" style="width: 80px; padding: 4px 8px; text-align: right; font-family: var(--font-mono);" min="15" max="45" step="0.5" value="30.0">
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="pred-amb" class="range-slider" min="15" max="45" step="0.5" value="30.0">
                <span class="range-val" id="pred-amb-val">30.0 °C</span>
              </div>
            </div>

            <!-- Module Temp -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="pred-mod" style="margin: 0;">Module Temperature (°C)</label>
                <input type="number" id="pred-mod-num" class="form-control" style="width: 80px; padding: 4px 8px; text-align: right; font-family: var(--font-mono);" min="15" max="75" step="0.5" value="50.0">
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="pred-mod" class="range-slider" min="15" max="75" step="0.5" value="50.0">
                <span class="range-val" id="pred-mod-val">50.0 °C</span>
              </div>
            </div>

            <!-- Time Picker -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="pred-hour">Time of Day (Hour)</label>
                <select id="pred-hour" class="form-select">
                  ${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i === 12 ? 'selected' : ''}>${i.toString().padStart(2, '0')}:00</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="pred-minute">Minute Interval</label>
                <select id="pred-minute" class="form-select">
                  <option value="0" selected>:00</option>
                  <option value="15">:15</option>
                  <option value="30">:30</option>
                  <option value="45">:45</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 10px;">
              <button type="button" id="btn-typical-cond" class="btn btn-secondary" style="flex: 1;">
                🌤️ Typical conditions for this time
              </button>
              <button type="button" id="btn-predict-now" class="btn btn-primary" style="min-width: 120px;">
                Predict
              </button>
            </div>
          </form>

          <div class="notice-box" style="margin-top: 24px;">
            <span>ℹ️</span> This is a prediction only. To compare with real output, use
            <a href="#/anomaly" style="color: var(--blue); text-decoration: underline;">Anomaly Detection</a>.
          </div>
        </div>

        <!-- Result Display Card -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <div class="prediction-result-card">
            <span class="badge" style="background: var(--surface-2); border: 1px solid var(--border); padding: 4px 12px; border-radius: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--amber);">
              Model Prediction
            </span>
            <div class="kw-headline">
              <span id="predicted-kw-text">0.0</span>
              <span class="kw-unit">kW</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
              Expected AC power for these conditions
            </p>

            <!-- Circular SVG Gauge -->
            <div class="gauge-wrapper">
              <svg class="gauge-svg" viewBox="0 0 180 180">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#f2cc60" />
                    <stop offset="100%" stop-color="#f0883e" />
                  </linearGradient>
                </defs>
                <circle class="gauge-bg" cx="90" cy="90" r="75" />
                <circle class="gauge-progress" id="gauge-circle-fill" cx="90" cy="90" r="75"
                  stroke-dasharray="471.24" stroke-dashoffset="471.24" />
              </svg>
              <div class="gauge-center-content">
                <span class="gauge-percent" id="gauge-percent-text">0%</span>
                <span class="gauge-sub">of peak</span>
              </div>
            </div>

            <p id="peak-reference-label" style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
              Facility Daily Peak: -- kW
            </p>
          </div>

          <!-- Diurnal Typical Day Chart Card -->
          <div class="card" style="padding: 20px;">
            <div class="card-header" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="font-size: 14px;">Diurnal Generation Profile</h3>
                <p class="card-subtitle" style="font-size: 11px;">96-point typical day curve with current condition point</p>
              </div>
            </div>
            <div style="height: 180px; position: relative;">
              <canvas id="typical-day-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach interactive listeners
  setupPredictionListeners(container);

  // Initial fetch and predict
  await loadTypicalDay(Number(document.getElementById('pred-plant').value));
  triggerPrediction();
}

async function loadTypicalDay(plantId) {
  if (typicalDayCache[plantId]) {
    renderTypicalChart(typicalDayCache[plantId]);
    return;
  }
  try {
    const data = await api.getTypicalDay(plantId);
    typicalDayCache[plantId] = data;
    renderTypicalChart(data);
  } catch (err) {
    console.error('Failed to load typical day curve:', err);
  }
}

function renderTypicalChart(data) {
  const canvas = document.getElementById('typical-day-chart');
  if (!canvas) return;

  const labels = data.map((d) => d.time);
  const values = data.map((d) => d.expected_kw);

  const peakVal = Math.max(...values, 1);
  const peakRef = document.getElementById('peak-reference-label');
  if (peakRef) {
    peakRef.textContent = `Facility Daily Peak: ${Math.round(peakVal).toLocaleString()} kW`;
  }

  if (typicalChart) {
    typicalChart.destroy();
  }

  typicalChart = createLineChart(
    canvas.getContext('2d'),
    labels,
    [
      {
        label: 'Typical Expected AC (kW)',
        data: values,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
    {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: true,
        },
      },
    }
  );
}

function setupPredictionListeners(container) {
  const plantSelect = container.querySelector('#pred-plant');
  const irradSlider = container.querySelector('#pred-irrad');
  const irradNum = container.querySelector('#pred-irrad-num');
  const irradVal = container.querySelector('#pred-irrad-val');

  const ambSlider = container.querySelector('#pred-amb');
  const ambNum = container.querySelector('#pred-amb-num');
  const ambVal = container.querySelector('#pred-amb-val');

  const modSlider = container.querySelector('#pred-mod');
  const modNum = container.querySelector('#pred-mod-num');
  const modVal = container.querySelector('#pred-mod-val');

  const hourSelect = container.querySelector('#pred-hour');
  const minuteSelect = container.querySelector('#pred-minute');
  const typicalBtn = container.querySelector('#btn-typical-cond');
  const predictBtn = container.querySelector('#btn-predict-now');

  // Sync Slider <-> Number input
  function sync(slider, num, label, unit = '') {
    slider.addEventListener('input', () => {
      num.value = slider.value;
      if (label) label.textContent = slider.value + unit;
      scheduleAutoPredict();
    });
    num.addEventListener('input', () => {
      slider.value = num.value;
      if (label) label.textContent = num.value + unit;
      scheduleAutoPredict();
    });
  }

  sync(irradSlider, irradNum, irradVal, '');
  sync(ambSlider, ambNum, ambVal, ' °C');
  sync(modSlider, modNum, modVal, ' °C');

  plantSelect.addEventListener('change', async () => {
    state.set('selectedPlant', Number(plantSelect.value));
    await loadTypicalDay(Number(plantSelect.value));
    triggerPrediction();
  });

  hourSelect.addEventListener('change', () => {
    setSunHour(Number(hourSelect.value));
    scheduleAutoPredict();
  });

  minuteSelect.addEventListener('change', scheduleAutoPredict);
  predictBtn.addEventListener('click', triggerPrediction);

  // Fill typical conditions button
  typicalBtn.addEventListener('click', () => {
    const pId = Number(plantSelect.value);
    const h = Number(hourSelect.value);
    const m = Number(minuteSelect.value);
    const data = typicalDayCache[pId];
    if (!data) return;

    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const point = data.find((d) => d.time === timeStr);
    if (point) {
      irradSlider.value = point.irradiation;
      irradNum.value = point.irradiation;
      irradVal.textContent = point.irradiation;

      ambSlider.value = point.ambient_temp;
      ambNum.value = point.ambient_temp;
      ambVal.textContent = point.ambient_temp + ' °C';

      modSlider.value = point.module_temp;
      modNum.value = point.module_temp;
      modVal.textContent = point.module_temp + ' °C';

      showToast(`Loaded typical weather for ${timeStr}`, 'info');
      triggerPrediction();
    }
  });
}

function scheduleAutoPredict() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerPrediction, 300);
}

async function triggerPrediction() {
  const plantId = Number(document.getElementById('pred-plant')?.value || 4135001);
  const irrad = parseFloat(document.getElementById('pred-irrad')?.value || 0);
  const amb = parseFloat(document.getElementById('pred-amb')?.value || 25);
  const mod = parseFloat(document.getElementById('pred-mod')?.value || 25);
  const hour = parseInt(document.getElementById('pred-hour')?.value || 12, 10);
  const minute = parseInt(document.getElementById('pred-minute')?.value || 0, 10);

  setSunHour(hour);

  try {
    const res = await api.predictPower({
      plant_id: plantId,
      irradiation: irrad,
      ambient_temp: amb,
      module_temp: mod,
      hour,
      minute,
    });

    const expectedKw = res.expected_kw;
    const textEl = document.getElementById('predicted-kw-text');
    if (textEl) {
      animateCountUp(textEl, expectedKw, 400, 1);
    }

    // Update gauge & 3D scene
    const peakKw = plantId === 4135001 ? 26000 : 26000;
    const peakFromData = typicalDayCache[plantId]
      ? Math.max(...typicalDayCache[plantId].map((d) => d.expected_kw), 1)
      : peakKw;

    const ratio = Math.max(0, Math.min(expectedKw / peakFromData, 1));
    const circumference = 471.24;
    const offset = circumference * (1 - ratio);

    const gaugeCircle = document.getElementById('gauge-circle-fill');
    if (gaugeCircle) {
      gaugeCircle.style.strokeDashoffset = offset.toFixed(2);
    }

    const gaugePct = document.getElementById('gauge-percent-text');
    if (gaugePct) {
      gaugePct.textContent = `${Math.round(ratio * 100)}%`;
    }

    // Set 3D solar field power glow
    setPower(ratio);
  } catch (err) {
    showToast(err.message || 'Prediction failed', 'error');
  }
}

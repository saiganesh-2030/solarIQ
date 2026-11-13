// Page 2: Anomaly Detection & Performance Deviation Analysis
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, formatKw, formatPct } from '../ui.js';
import { setMode, setSunHour, pulse } from '../three/scene.js';

export async function render(container) {
  setMode('anomaly');

  const selectedPlant = state.get('selectedPlant') || 4135001;
  const initialPlantId = (selectedPlant === 'all' || !selectedPlant) ? 4135001 : Number(selectedPlant);
  const initialK = state.get('k') || 3.5;

  container.innerHTML = `
    <div class="page-enter">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Performance Deviation Analysis</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Compare actual inverter generation against expected physics to identify candidates for review.</p>
      </div>

      <!-- Quick Preset Buttons -->
      <div class="preset-bar">
        <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); align-self: center;">Test Scenarios:</span>
        <button type="button" class="btn-preset" id="preset-normal">
          ✅ Scenario 1: Normal Generation (Plant 1)
        </button>
        <button type="button" class="btn-preset" id="preset-flagged">
          ⚠️ Scenario 2: Underperforming Output (Plant 2)
        </button>
        <button type="button" class="btn-preset" id="preset-zero">
          ⚡ Scenario 3: Zero Reading / Data Gap (Plant 1)
        </button>
      </div>

      <div class="grid-2col">
        <!-- Input Form Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Generation & Condition Inputs</h2>
              <p class="card-subtitle">Supply actual inverter measurement and concurrent weather</p>
            </div>
          </div>

          <form id="anomaly-form" onsubmit="return false;">
            <div class="form-group">
              <label class="form-label" for="anom-plant">Facility</label>
              <select id="anom-plant" class="form-select">
                <option value="4135001" ${initialPlantId === 4135001 ? 'selected' : ''}>Plant 1 (ID: 4135001)</option>
                <option value="4136001" ${initialPlantId === 4136001 ? 'selected' : ''}>Plant 2 (ID: 4136001)</option>
              </select>
            </div>

            <!-- Actual AC Power -->
            <div class="form-group">
              <label class="form-label" for="anom-actual">
                Actual AC Power (kW) <span style="color: var(--orange); font-weight: 700;">*</span>
              </label>
              <input type="number" id="anom-actual" class="form-control" style="font-family: var(--font-mono); font-size: 15px;" min="0" step="0.1" value="22500.0" placeholder="e.g. 22500.0">
            </div>

            <!-- K Threshold Slider -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="anom-k" style="margin: 0;" title="Higher K flags fewer, larger deviations.">
                  Sensitivity Multiplier (K) ℹ️
                </label>
                <span class="range-val" id="anom-k-val" style="color: var(--amber);">${initialK}</span>
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="anom-k" class="range-slider" min="1" max="6" step="0.1" value="${initialK}">
              </div>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                Higher K flags fewer, larger deviations (default: 3.5).
              </p>
            </div>

            <!-- Irradiation -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="anom-irrad" style="margin: 0;">Solar Irradiation (kW/m²)</label>
                <span class="range-val" id="anom-irrad-val">0.80</span>
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="anom-irrad" class="range-slider" min="0" max="1.2" step="0.01" value="0.80">
              </div>
            </div>

            <!-- Ambient Temp -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="anom-amb" style="margin: 0;">Ambient Temperature (°C)</label>
                <span class="range-val" id="anom-amb-val">30.0 °C</span>
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="anom-amb" class="range-slider" min="15" max="45" step="0.5" value="30.0">
              </div>
            </div>

            <!-- Module Temp -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" for="anom-mod" style="margin: 0;">Module Temperature (°C)</label>
                <span class="range-val" id="anom-mod-val">50.0 °C</span>
              </div>
              <div class="range-slider-wrapper">
                <input type="range" id="anom-mod" class="range-slider" min="15" max="75" step="0.5" value="50.0">
              </div>
            </div>

            <!-- Time Picker -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="anom-hour">Hour</label>
                <select id="anom-hour" class="form-select">
                  ${Array.from({ length: 24 }, (_, i) => `<option value="${i}" ${i === 12 ? 'selected' : ''}>${i.toString().padStart(2, '0')}:00</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="anom-minute">Minute</label>
                <select id="anom-minute" class="form-select">
                  <option value="0" selected>:00</option>
                  <option value="15">:15</option>
                  <option value="30">:30</option>
                  <option value="45">:45</option>
                </select>
              </div>
            </div>

            <button type="button" id="btn-run-anomaly" class="btn btn-primary" style="width: 100%;">
              Analyze Deviation
            </button>
          </form>

          <!-- Expandable How It Is Decided -->
          <details class="how-decided-details">
            <summary class="how-decided-summary">How it is decided ▾</summary>
            <div style="margin-top: 10px; color: var(--text-muted); line-height: 1.6;">
              <p>• <strong>Residual:</strong> Actual kW minus Expected kW. Negative means output was below prediction.</p>
              <p>• <strong>Percentage Deviation:</strong> (Residual / Expected) × 100, calculated only when expected power ≥ 500 kW (below 500 kW is n/a).</p>
              <p>• <strong>Anomaly Threshold:</strong> Flagged when percentage deviation falls outside [Center % - K × Spread %, Center % + K × Spread %] derived from model validation distribution.</p>
            </div>
          </details>
        </div>

        <!-- Analysis Results Card -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="card" id="anomaly-result-card">
            <div class="card-header">
              <h2 class="card-title">Deviation Assessment</h2>
              <span id="status-chip-container">
                <span class="status-chip chip-normal">Evaluating...</span>
              </span>
            </div>

            <!-- Comparison Visual Bars -->
            <div class="comparison-card">
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
                <span style="color: var(--blue);">Expected Power</span>
                <span id="bar-expected-val" style="font-family: var(--font-mono);">-- kW</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bar-fill-expected" id="bar-fill-expected" style="width: 0%;"></div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;">
                <span style="color: var(--amber);">Actual Power</span>
                <span id="bar-actual-val" style="font-family: var(--font-mono);">-- kW</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill bar-fill-actual" id="bar-fill-actual" style="width: 0%;"></div>
              </div>
            </div>

            <!-- Metrics Table / Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div style="background: var(--surface-2); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Residual Deviation</div>
                <div id="stat-residual-val" style="font-size: 20px; font-weight: 700; font-family: var(--font-mono); margin-top: 4px;">-- kW</div>
              </div>
              <div style="background: var(--surface-2); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Percentage Gap</div>
                <div id="stat-pct-val" style="font-size: 20px; font-weight: 700; font-family: var(--font-mono); margin-top: 4px;">--%</div>
              </div>
            </div>

            <!-- Flag Type and Threshold -->
            <div style="background: var(--surface-2); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
                <span style="color: var(--text-muted);">Classification:</span>
                <strong id="stat-classification-val" style="color: var(--text);">Normal</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span style="color: var(--text-muted);">Allowed Threshold Range:</span>
                <span id="stat-threshold-val" style="font-family: var(--font-mono); font-size: 12px; color: var(--blue);">[-- %, -- %]</span>
              </div>
            </div>

            <!-- Possible Things to Check (Context Card) -->
            <div id="info-check-card" style="display: none; background: rgba(242, 204, 96, 0.08); border: 1px solid rgba(242, 204, 96, 0.25); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px;">
              <h4 style="font-size: 13px; font-weight: 700; color: var(--amber); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>📋</span> Possible things to check
              </h4>
              <p id="info-check-text" style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.5;"></p>
              <div style="font-size: 11px; color: var(--text-muted); border-top: 1px solid rgba(242, 204, 96, 0.2); padding-top: 6px;">
                * Weather patterns are an association, not proof of cause.
              </div>
            </div>

            <!-- Disclaimer Card -->
            <div class="disclaimer-card">
              <span class="disclaimer-icon">⚠️</span>
              <div>
                <strong>Notice:</strong> This is an investigation candidate, not a confirmed equipment fault. Normal operational fluctuations or localized cloud shadows may be present.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupAnomalyListeners(container);
  // Run initial evaluation
  runAnomalyAnalysis();
}

function setupAnomalyListeners(container) {
  const plantSelect = container.querySelector('#anom-plant');
  const actualInput = container.querySelector('#anom-actual');
  const kSlider = container.querySelector('#anom-k');
  const kVal = container.querySelector('#anom-k-val');

  const irradSlider = container.querySelector('#anom-irrad');
  const irradVal = container.querySelector('#anom-irrad-val');
  const ambSlider = container.querySelector('#anom-amb');
  const ambVal = container.querySelector('#anom-amb-val');
  const modSlider = container.querySelector('#anom-mod');
  const modVal = container.querySelector('#anom-mod-val');
  const hourSelect = container.querySelector('#anom-hour');
  const minuteSelect = container.querySelector('#anom-minute');
  const runBtn = container.querySelector('#btn-run-anomaly');

  kSlider.addEventListener('input', () => {
    kVal.textContent = kSlider.value;
    state.set('k', parseFloat(kSlider.value));
  });

  irradSlider.addEventListener('input', () => {
    irradVal.textContent = irradSlider.value;
  });

  ambSlider.addEventListener('input', () => {
    ambVal.textContent = ambSlider.value + ' °C';
  });

  modSlider.addEventListener('input', () => {
    modVal.textContent = modSlider.value + ' °C';
  });

  hourSelect.addEventListener('change', () => {
    setSunHour(Number(hourSelect.value));
  });

  runBtn.addEventListener('click', runAnomalyAnalysis);

  // Preset Scenario 1: Normal
  container.querySelector('#preset-normal').addEventListener('click', () => {
    plantSelect.value = '4135001';
    irradSlider.value = '0.80';
    irradVal.textContent = '0.80';
    ambSlider.value = '30.0';
    ambVal.textContent = '30.0 °C';
    modSlider.value = '50.0';
    modVal.textContent = '50.0 °C';
    hourSelect.value = '12';
    minuteSelect.value = '0';
    actualInput.value = '22800.0';
    kSlider.value = '3.5';
    kVal.textContent = '3.5';
    showToast('Loaded Scenario 1: Normal midday generation', 'info');
    runAnomalyAnalysis();
  });

  // Preset Scenario 2: Underperforming (Plant 2 contract example)
  container.querySelector('#preset-flagged').addEventListener('click', () => {
    plantSelect.value = '4136001';
    irradSlider.value = '0.49';
    irradVal.textContent = '0.49';
    ambSlider.value = '31.2';
    ambVal.textContent = '31.2 °C';
    modSlider.value = '39.9';
    modVal.textContent = '39.9 °C';
    hourSelect.value = '13';
    minuteSelect.value = '0';
    actualInput.value = '3078.35';
    kSlider.value = '3.5';
    kVal.textContent = '3.5';
    showToast('Loaded Scenario 2: Underperforming Plant 2 output', 'info');
    runAnomalyAnalysis();
  });

  // Preset Scenario 3: Zero Reading / Data Gap
  container.querySelector('#preset-zero').addEventListener('click', () => {
    plantSelect.value = '4135001';
    irradSlider.value = '0.85';
    irradVal.textContent = '0.85';
    ambSlider.value = '31.0';
    ambVal.textContent = '31.0 °C';
    modSlider.value = '52.0';
    modVal.textContent = '52.0 °C';
    hourSelect.value = '12';
    minuteSelect.value = '30';
    actualInput.value = '0.0';
    kSlider.value = '3.5';
    kVal.textContent = '3.5';
    showToast('Loaded Scenario 3: High sun with zero generation', 'info');
    runAnomalyAnalysis();
  });
}

async function runAnomalyAnalysis() {
  const plantId = Number(document.getElementById('anom-plant')?.value || 4135001);
  const actualKw = parseFloat(document.getElementById('anom-actual')?.value || 0);
  const k = parseFloat(document.getElementById('anom-k')?.value || 3.5);
  const irrad = parseFloat(document.getElementById('anom-irrad')?.value || 0.8);
  const amb = parseFloat(document.getElementById('anom-amb')?.value || 30.0);
  const mod = parseFloat(document.getElementById('anom-mod')?.value || 50.0);
  const hour = parseInt(document.getElementById('anom-hour')?.value || 12, 10);
  const minute = parseInt(document.getElementById('anom-minute')?.value || 0, 10);

  setSunHour(hour);

  try {
    const res = await api.checkAnomaly({
      plant_id: plantId,
      actual_kw: actualKw,
      irradiation: irrad,
      ambient_temp: amb,
      module_temp: mod,
      hour,
      minute,
      k,
    });

    const expectedKw = res.expected_kw;
    const residualKw = res.residual_kw;
    const isFlagged = res.flagged;
    const pctDev = res.pct_deviation;

    // Update Bars
    const maxKw = Math.max(expectedKw, actualKw, 1);
    const expectedPct = Math.min((expectedKw / maxKw) * 100, 100);
    const actualPct = Math.min((actualKw / maxKw) * 100, 100);

    const barExp = document.getElementById('bar-fill-expected');
    const barAct = document.getElementById('bar-fill-actual');
    if (barExp) barExp.style.width = `${expectedPct}%`;
    if (barAct) barAct.style.width = `${actualPct}%`;

    document.getElementById('bar-expected-val').textContent = formatKw(expectedKw);
    document.getElementById('bar-actual-val').textContent = formatKw(actualKw);

    // Update Residual & Percentage
    const resEl = document.getElementById('stat-residual-val');
    if (resEl) {
      const sign = residualKw > 0 ? '+' : '';
      resEl.textContent = `${sign}${residualKw.toFixed(1)} kW`;
      resEl.style.color = residualKw >= 0 ? 'var(--green)' : 'var(--red)';
    }

    const pctEl = document.getElementById('stat-pct-val');
    if (pctEl) {
      pctEl.textContent = formatPct(pctDev);
      pctEl.style.color = (pctDev !== null && pctDev < 0) ? 'var(--red)' : 'var(--text)';
    }

    // Status Chip
    const chipContainer = document.getElementById('status-chip-container');
    if (chipContainer) {
      if (isFlagged) {
        chipContainer.innerHTML = '<span class="status-chip chip-flagged">⚠️ Flagged for review</span>';
        pulse('alert');
      } else {
        chipContainer.innerHTML = '<span class="status-chip chip-normal">✓ Within normal range</span>';
      }
    }

    // Classification text
    const classEl = document.getElementById('stat-classification-val');
    if (classEl) {
      if (isFlagged) {
        classEl.textContent = res.type || 'Flagged deviation';
        classEl.style.color = 'var(--amber)';
      } else {
        classEl.textContent = 'Normal generation profile';
        classEl.style.color = 'var(--green)';
      }
    }

    // Threshold range
    const thrEl = document.getElementById('stat-threshold-val');
    if (thrEl && res.threshold_pct) {
      thrEl.textContent = `[${res.threshold_pct[0].toFixed(1)}%, +${res.threshold_pct[1].toFixed(1)}%]`;
    }

    // Context Card
    const infoCard = document.getElementById('info-check-card');
    const infoText = document.getElementById('info-check-text');
    if (infoCard && infoText) {
      if (isFlagged) {
        infoCard.style.display = 'block';
        infoText.innerHTML = `
          Row flagged as <strong>"${res.type}"</strong>. Concurrent ambient temperature was <strong>${amb.toFixed(1)} °C</strong>, module temperature was <strong>${mod.toFixed(1)} °C</strong>, and irradiation was <strong>${irrad.toFixed(2)} kW/m²</strong>. Verify physical inverter connection and local meter calibration.
        `;
      } else {
        infoCard.style.display = 'none';
      }
    }
  } catch (err) {
    showToast(err.message || 'Deviation check failed', 'error');
  }
}

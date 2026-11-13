// Page 6: Financial Impact Estimation
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, formatKwh, formatCurrency, renderErrorCard } from '../ui.js';
import { createBarChart, createDoughnutChart } from '../charts.js';
import { setMode, pulse } from '../three/scene.js';

let activeAnalysis = null;
let dailyShortfallChart = null;
let shortfallDonutChart = null;
let currentPlantScope = 'all';
let debounceCalc = null;

export async function render(container) {
  setMode('financial');

  container.innerHTML = `
    <div class="page-enter">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Financial Impact & Energy Monetization</h1>
          <p style="color: var(--text-muted); font-size: 14px;">Quantify revenue shortfall, uncaptured generation potential, and investigate financial risk across facilities.</p>
        </div>
        <button type="button" id="btn-copy-summary" class="btn btn-secondary">
          📋 Copy Executive Summary
        </button>
      </div>

      <!-- Prominent Accounting Disclaimer Callout -->
      <div class="notice-box" style="margin-bottom: 24px; border-left-color: var(--amber);">
        <span>ℹ️</span> <strong>Financial Estimation Disclaimer:</strong> Estimated values. Part of the gap is normal model error, so treat this as an operational investigation estimate, not an audited accounting figure.
      </div>

      <!-- Empty State / Analysis Required Container -->
      <div id="financial-empty-state" class="card" style="display: none; text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">No Batch Analysis Loaded</h2>
        <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 24px; font-size: 14px;">
          Financial monetization requires an evaluated batch of time-series telemetry. Load the sample dataset or upload a CSV file.
        </p>
        <div style="display: flex; justify-content: center; gap: 14px;">
          <button type="button" id="btn-load-demo-financial" class="btn btn-primary">
            ⚡ Run Demo Analysis
          </button>
          <a href="#/historical" class="btn btn-secondary" style="text-decoration: none;">
            📂 Go to Historical Upload
          </a>
        </div>
      </div>

      <!-- Main Financial Content Container -->
      <div id="financial-content" style="display: none;">
        <!-- Controls Bar -->
        <div class="card" style="padding: 16px 20px; margin-bottom: 24px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
              <!-- Scope -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="fin-scope-filter" style="margin: 0;">Scope:</label>
                <select id="fin-scope-filter" class="form-select" style="width: 150px; padding: 6px 10px;">
                  <option value="all" selected>Total Facility Portfolio</option>
                  <option value="Plant 1">Plant 1 Only</option>
                  <option value="Plant 2">Plant 2 Only</option>
                </select>
              </div>

              <!-- Tariff Input -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="fin-tariff" style="margin: 0;">PPA Tariff (₹/kWh):</label>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-weight: 700; color: var(--amber);">₹</span>
                  <input type="number" id="fin-tariff" class="form-control" style="width: 80px; padding: 5px 8px;" step="0.5" min="0" max="1000" value="6.0">
                </div>
              </div>

              <!-- K Sensitivity Slider -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="fin-k-slider" style="margin: 0;">Sensitivity (K):</label>
                <input type="range" id="fin-k-slider" class="range-slider" min="1" max="6" step="0.1" value="3.5" style="width: 100px;">
                <span id="fin-k-val" class="range-val" style="min-width: 30px;">3.5</span>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);" id="fin-date-label">
              Span: --
            </div>
          </div>
        </div>

        <!-- Headline Financial Stat Cards -->
        <div class="stat-grid" style="margin-bottom: 24px;">
          <div class="stat-tile">
            <div class="stat-value" id="card-actual-kwh">-- kWh</div>
            <div class="stat-label">Total Actual Generation</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="card-expected-kwh">Expected: -- kWh</div>
          </div>

          <div class="stat-tile">
            <div class="stat-value" id="card-flagged-money" style="color: var(--amber);">₹0</div>
            <div class="stat-label">Flagged Anomalous Shortfall</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="card-flagged-kwh">0 kWh on flagged rows</div>
          </div>

          <div class="stat-tile">
            <div class="stat-value" id="card-total-shortfall-money" style="color: var(--red);">₹0</div>
            <div class="stat-label">Total Generation Shortfall</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="card-total-shortfall-kwh">All sub-expected slots</div>
          </div>

          <div class="stat-tile">
            <div class="stat-value" id="card-surplus-money" style="color: var(--green);">₹0</div>
            <div class="stat-label">Total Generation Surplus</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="card-surplus-kwh">Over-generation credits</div>
          </div>
        </div>

        <!-- Visual Analytics Row: Daily Shortfall Bar Chart & Flagged vs Normal Donut -->
        <div class="grid-2col" style="margin-bottom: 28px;">
          <!-- Daily Stacked Bar Chart -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Daily Generation Shortfall (₹)</h3>
                <p class="card-subtitle">Estimated monetary impact per operational day</p>
              </div>
            </div>
            <div style="height: 250px; position: relative;">
              <canvas id="daily-shortfall-chart"></canvas>
            </div>
          </div>

          <!-- Donut Breakdown Chart -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Shortfall Composition</h3>
                <p class="card-subtitle">Flagged candidates vs regular baseline variance</p>
              </div>
            </div>
            <div style="height: 250px; position: relative;">
              <canvas id="shortfall-donut-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- "What-If" Instant Financial Mini Calculator -->
        <div class="card" style="margin-bottom: 24px;">
          <div class="card-header">
            <div>
              <h2 class="card-title">⚡ "What-If" Point Valuation Calculator</h2>
              <p class="card-subtitle">Quickly simulate revenue deviation for a single 15-minute generation reading</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: end;">
            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="calc-expected">Expected Power (kW)</label>
              <input type="number" id="calc-expected" class="form-control" value="20000" min="0" step="100">
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="calc-actual">Actual Power (kW)</label>
              <input type="number" id="calc-actual" class="form-control" value="15000" min="0" step="100">
            </div>

            <div class="form-group" style="margin: 0;">
              <label class="form-label" for="calc-tariff">Custom Tariff (₹/kWh)</label>
              <input type="number" id="calc-tariff" class="form-control" value="6.0" step="0.5">
            </div>

            <div>
              <button type="button" id="btn-calc-convert" class="btn btn-primary" style="width: 100%;">
                Compute 15-min Value
              </button>
            </div>
          </div>

          <!-- Calculator Results Box -->
          <div id="whatif-result-box" style="margin-top: 18px; padding: 14px 18px; background: var(--surface-2); border-radius: var(--radius-sm); border: 1px solid var(--border); display: none;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div>
                <span style="font-size: 11px; color: var(--text-muted);">Energy Delta:</span>
                <div id="whatif-kwh" style="font-size: 16px; font-weight: 700; font-family: var(--font-mono); margin-top: 2px;">-- kWh</div>
              </div>
              <div>
                <span style="font-size: 11px; color: var(--text-muted);">Estimated Revenue Impact:</span>
                <div id="whatif-money" style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); margin-top: 2px;">--</div>
              </div>
              <div>
                <span style="font-size: 11px; color: var(--text-muted);">Interval Duration:</span>
                <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">15 minutes (0.25 h)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupInitialState(container);
}

async function setupInitialState(container) {
  const lastId = state.get('lastAnalysisId');
  const emptyState = container.querySelector('#financial-empty-state');
  const content = container.querySelector('#financial-content');

  if (!lastId) {
    if (emptyState) emptyState.style.display = 'block';
    if (content) content.style.display = 'none';

    container.querySelector('#btn-load-demo-financial')?.addEventListener('click', async () => {
      showToast('Running demo analysis...', 'info');
      try {
        const res = await api.getDemoAnalysis(6.0, 3.5);
        state.set('lastAnalysisId', res.analysis_id);
        if (emptyState) emptyState.style.display = 'none';
        if (content) content.style.display = 'block';
        loadFinancialData(res);
      } catch (e) {
        showToast('Demo failed: ' + e.message, 'error');
      }
    });
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (content) content.style.display = 'block';

  try {
    const tariff = parseFloat(document.getElementById('fin-tariff')?.value || 6.0);
    const k = parseFloat(document.getElementById('fin-k-slider')?.value || 3.5);
    const data = await api.getAnalysis(lastId, tariff, k);
    loadFinancialData(data);
  } catch (err) {
    showToast('Failed to load analysis: ' + err.message, 'error');
  }

  setupEventListeners(container);
}

function setupEventListeners(container) {
  const tariffInput = container.querySelector('#fin-tariff');
  const kSlider = container.querySelector('#fin-k-slider');
  const kVal = container.querySelector('#fin-k-val');
  const scopeFilter = container.querySelector('#fin-scope-filter');
  const copyBtn = container.querySelector('#btn-copy-summary');
  const calcBtn = container.querySelector('#btn-calc-convert');

  kSlider.addEventListener('input', () => {
    kVal.textContent = kSlider.value;
    scheduleRecomputeFinancial();
  });

  tariffInput.addEventListener('input', scheduleRecomputeFinancial);

  scopeFilter.addEventListener('change', () => {
    currentPlantScope = scopeFilter.value;
    updateHeadlineCards();
    updateCharts();
  });

  copyBtn.addEventListener('click', copySummaryToClipboard);
  calcBtn.addEventListener('click', runWhatIfCalculator);
}

function scheduleRecomputeFinancial() {
  if (!activeAnalysis?.analysis_id) return;
  clearTimeout(debounceCalc);
  debounceCalc = setTimeout(async () => {
    const tariff = parseFloat(document.getElementById('fin-tariff')?.value || 6.0);
    const k = parseFloat(document.getElementById('fin-k-slider')?.value || 3.5);
    try {
      const res = await api.getAnalysis(activeAnalysis.analysis_id, tariff, k);
      loadFinancialData(res);
      showToast('Updated financial valuations', 'info');
    } catch (e) {
      showToast('Recalculation failed: ' + e.message, 'error');
    }
  }, 350);
}

function loadFinancialData(data) {
  activeAnalysis = data;

  // Date span
  const dateLabel = document.getElementById('fin-date-label');
  if (dateLabel && data.date_range?.length >= 2) {
    dateLabel.textContent = `Span: ${data.date_range[0].split(' ')[0]} to ${data.date_range[1].split(' ')[0]}`;
  }

  updateHeadlineCards();
  updateCharts();
}

function updateHeadlineCards() {
  if (!activeAnalysis?.summary) return;

  const summary = activeAnalysis.summary;
  const byPlant = summary.by_plant || [];

  let actualKwh = 0;
  let expectedKwh = 0;
  let flaggedShortfallKwh = 0;
  let flaggedShortfallMoney = 0;
  let totalShortfallKwh = 0;
  let totalShortfallMoney = 0;

  if (currentPlantScope === 'all') {
    byPlant.forEach((p) => {
      actualKwh += p.actual_kwh;
      expectedKwh += p.expected_kwh;
      flaggedShortfallKwh += p.flagged_shortfall_kwh;
      flaggedShortfallMoney += p.flagged_shortfall_money;
      totalShortfallKwh += p.shortfall_kwh;
      totalShortfallMoney += p.shortfall_money;
    });
  } else {
    const match = byPlant.find((p) => p.plant === currentPlantScope);
    if (match) {
      actualKwh = match.actual_kwh;
      expectedKwh = match.expected_kwh;
      flaggedShortfallKwh = match.flagged_shortfall_kwh;
      flaggedShortfallMoney = match.flagged_shortfall_money;
      totalShortfallKwh = match.shortfall_kwh;
      totalShortfallMoney = match.shortfall_money;
    }
  }

  const surplusKwh = Math.max(0, actualKwh - expectedKwh);
  const tariff = activeAnalysis.tariff || 6.0;
  const surplusMoney = surplusKwh * tariff;

  document.getElementById('card-actual-kwh').textContent = formatKwh(actualKwh);
  document.getElementById('card-expected-kwh').textContent = `Expected: ${formatKwh(expectedKwh)}`;

  document.getElementById('card-flagged-money').textContent = formatCurrency(flaggedShortfallMoney);
  document.getElementById('card-flagged-kwh').textContent = `${formatKwh(flaggedShortfallKwh)} on flagged rows`;

  document.getElementById('card-total-shortfall-money').textContent = formatCurrency(totalShortfallMoney);
  document.getElementById('card-total-shortfall-kwh').textContent = `${formatKwh(totalShortfallKwh)} sub-expected`;

  document.getElementById('card-surplus-money').textContent = formatCurrency(surplusMoney);
  document.getElementById('card-surplus-kwh').textContent = `${formatKwh(surplusKwh)} over-generation`;
}

function updateCharts() {
  if (!activeAnalysis) return;

  // 1. Daily Shortfall Stacked Bar Chart
  const barCanvas = document.getElementById('daily-shortfall-chart');
  if (barCanvas && activeAnalysis.daily) {
    const daily = activeAnalysis.daily;
    const uniqueDates = Array.from(new Set(daily.map((d) => d.date))).sort();

    const p1Money = uniqueDates.map((date) => {
      const item = daily.find((d) => d.date === date && d.plant === 'Plant 1');
      return item ? item.shortfall_money : 0;
    });

    const p2Money = uniqueDates.map((date) => {
      const item = daily.find((d) => d.date === date && d.plant === 'Plant 2');
      return item ? item.shortfall_money : 0;
    });

    const datasets = [];
    if (currentPlantScope === 'all' || currentPlantScope === 'Plant 1') {
      datasets.push({
        label: 'Plant 1 Shortfall (₹)',
        data: p1Money,
        backgroundColor: '#58a6ff',
      });
    }
    if (currentPlantScope === 'all' || currentPlantScope === 'Plant 2') {
      datasets.push({
        label: 'Plant 2 Shortfall (₹)',
        data: p2Money,
        backgroundColor: '#f0883e',
      });
    }

    if (dailyShortfallChart) dailyShortfallChart.destroy();
    dailyShortfallChart = createBarChart(
      barCanvas.getContext('2d'),
      uniqueDates.map((d) => d.slice(5)), // MM-DD
      datasets,
      {
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            ticks: { callback: (v) => '₹' + v.toLocaleString() },
          },
        },
      }
    );
  }

  // 2. Shortfall Donut: Flagged vs Unflagged Shortfall
  const donutCanvas = document.getElementById('shortfall-donut-chart');
  if (donutCanvas && activeAnalysis.summary?.by_plant) {
    let flaggedSum = 0;
    let totalSum = 0;

    activeAnalysis.summary.by_plant.forEach((p) => {
      if (currentPlantScope === 'all' || p.plant === currentPlantScope) {
        flaggedSum += p.flagged_shortfall_money;
        totalSum += p.shortfall_money;
      }
    });

    const unflaggedSum = Math.max(0, totalSum - flaggedSum);

    if (shortfallDonutChart) shortfallDonutChart.destroy();
    shortfallDonutChart = createDoughnutChart(
      donutCanvas.getContext('2d'),
      ['Flagged Candidate Shortfall', 'Baseline / Expected Variance'],
      [
        {
          data: [flaggedSum, unflaggedSum],
          backgroundColor: ['#f2cc60', '#30363d'],
          borderColor: '#161b22',
          borderWidth: 2,
        },
      ],
      {
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString()}`,
            },
          },
        },
      }
    );
  }
}

async function runWhatIfCalculator() {
  const expKw = parseFloat(document.getElementById('calc-expected')?.value || 0);
  const actKw = parseFloat(document.getElementById('calc-actual')?.value || 0);
  const tariff = parseFloat(document.getElementById('calc-tariff')?.value || 6.0);

  try {
    const res = await api.convertFinancial({
      expected_kw: expKw,
      actual_kw: actKw,
      tariff,
      interval_hours: 0.25,
    });

    const box = document.getElementById('whatif-result-box');
    const kwhEl = document.getElementById('whatif-kwh');
    const moneyEl = document.getElementById('whatif-money');

    if (box) box.style.display = 'block';

    const netKwh = res.net_kwh;
    const netMoney = res.net_money;

    if (kwhEl) {
      const sign = netKwh > 0 ? '+' : '';
      kwhEl.textContent = `${sign}${netKwh.toFixed(1)} kWh`;
      kwhEl.style.color = netKwh >= 0 ? 'var(--green)' : 'var(--red)';
    }

    if (moneyEl) {
      const sign = netMoney > 0 ? '+' : '';
      moneyEl.textContent = `${sign}₹${Math.abs(netMoney).toLocaleString(undefined, { minimumFractionDigits: 1 })}`;
      moneyEl.style.color = netMoney >= 0 ? 'var(--green)' : 'var(--red)';
    }
  } catch (err) {
    showToast('Conversion failed: ' + err.message, 'error');
  }
}

function copySummaryToClipboard() {
  if (!activeAnalysis?.summary) {
    showToast('No active analysis to copy', 'error');
    return;
  }

  const s = activeAnalysis.summary;
  const dRange = activeAnalysis.date_range?.join(' to ') || 'N/A';
  const tariff = activeAnalysis.tariff || 6.0;

  const text = `
=== SolarIQ Executive Financial & Performance Summary ===
Date Range: ${dRange}
Applied Tariff: ₹${tariff}/kWh
Telemetry Readings Analyzed: ${activeAnalysis.rows_used.toLocaleString()}
Flagged Investigation Candidates: ${s.flagged_count} (${s.flagged_pct.toFixed(1)}%)
Net Generation Balance: ${s.net_kwh.toLocaleString()} kWh (Estimated Valuation: ₹${s.net_money.toLocaleString()})

Notice: Estimated figures. Normal model error variance applies.
=========================================================
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    showToast('Executive summary copied to clipboard', 'info');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

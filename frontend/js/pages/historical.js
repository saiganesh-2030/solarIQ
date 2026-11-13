// Page 4: Historical Time-Series Analysis
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, formatKw, formatPct, renderErrorCard } from '../ui.js';
import { createLineChart } from '../charts.js';
import { setMode, pulse } from '../three/scene.js';

let currentAnalysis = null;
let timeSeriesChart = null;
let currentScope = 'all';
let currentRange = 'all';
let currentPage = 1;
const PAGE_SIZE = 15;
let searchQuery = '';
let sortField = 't';
let sortAsc = true;
let debounceRecompute = null;

export async function render(container) {
  setMode('historical');

  container.innerHTML = `
    <div class="page-enter">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Historical Generation & Batch Analysis</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Upload SCADA time-series telemetry to detect anomalies, quantify generation gaps, and flag investigation candidates.</p>
      </div>

      <!-- Top Section: Upload & Demo -->
      <div class="card" style="margin-bottom: 28px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: center;">
          <!-- Dropzone -->
          <div class="upload-dropzone" id="upload-dropzone">
            <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
            <div class="upload-icon">📂</div>
            <div class="upload-title">Drop your operational CSV file here, or browse</div>
            <div class="upload-subtitle">Accepts standard .csv format up to 5 MB with 15-minute readings</div>
          </div>

          <!-- Quick Action Buttons & Format Specs -->
          <div style="display: flex; flex-direction: column; gap: 12px; justify-content: center;">
            <button type="button" id="btn-use-demo" class="btn btn-primary" style="width: 100%;">
              ⚡ Run with Demo Dataset
            </button>
            <a href="/api/sample-csv" download="solar_sample_template.csv" class="btn btn-secondary" style="width: 100%; text-decoration: none;">
              📥 Download Sample CSV Template
            </a>
            <div style="font-size: 11px; color: var(--text-muted); background: var(--surface-2); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <strong>Required Headers:</strong><br>
              <code>DATE_TIME, PLANT_ID, AC_POWER, AMBIENT_TEMPERATURE, MODULE_TEMPERATURE, IRRADIATION</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Results Area (Populated after analysis) -->
      <div id="analysis-results-section" style="display: none;">
        <!-- Summary Stat Tiles -->
        <div class="stat-grid" style="margin-bottom: 20px;">
          <div class="stat-tile">
            <div class="stat-value" id="stat-rows-used">--</div>
            <div class="stat-label">Valid Telemetry Rows</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="stat-rows-dropped">0 dropped</div>
          </div>
          <div class="stat-tile">
            <div class="stat-value" id="stat-flagged-count" style="color: var(--amber);">--</div>
            <div class="stat-label">Flagged Candidates</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="stat-flagged-pct">-- % of total</div>
          </div>
          <div class="stat-tile">
            <div class="stat-value" id="stat-date-span" style="font-size: 16px; font-family: var(--font-mono); line-height: 1.4;">--</div>
            <div class="stat-label">Observation Period</div>
          </div>
          <div class="stat-tile">
            <div class="stat-value" id="stat-net-kwh">-- kWh</div>
            <div class="stat-label">Net Deviation Balance</div>
          </div>
        </div>

        <!-- Controls Bar (K slider, Tariff, Plant Scope) -->
        <div class="card" style="padding: 16px 20px; margin-bottom: 24px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
              <!-- Scope -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="history-plant-filter" style="margin: 0;">Scope:</label>
                <select id="history-plant-filter" class="form-select" style="width: 140px; padding: 6px 10px;">
                  <option value="all">All Facilities</option>
                  <option value="Plant 1">Plant 1</option>
                  <option value="Plant 2">Plant 2</option>
                </select>
              </div>

              <!-- K Slider -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="history-k-slider" style="margin: 0;">Sensitivity (K):</label>
                <input type="range" id="history-k-slider" class="range-slider" min="1" max="6" step="0.1" value="3.5" style="width: 110px;">
                <span id="history-k-val" class="range-val" style="min-width: 32px;">3.5</span>
              </div>

              <!-- Tariff Input -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label class="form-label" for="history-tariff-input" style="margin: 0;">Tariff (₹/kWh):</label>
                <input type="number" id="history-tariff-input" class="form-control" style="width: 70px; padding: 4px 8px;" step="0.5" value="6.0">
              </div>
            </div>

            <!-- Export Button -->
            <div>
              <a id="btn-download-csv" class="btn btn-secondary" style="text-decoration: none;" href="#" target="_blank">
                📥 Download Results CSV
              </a>
            </div>
          </div>
        </div>

        <!-- Daily Heat Strip -->
        <div class="card" style="padding: 16px 20px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 class="card-title" style="font-size: 14px;">Daily Investigation Candidates Density</h3>
            <span style="font-size: 11px; color: var(--text-muted);">Color intensity indicates daily flagged count</span>
          </div>
          <div id="heat-strip-wrapper" class="heat-strip-container">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Time-Series Chart Card -->
        <div class="card" style="margin-bottom: 28px;">
          <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 class="card-title">Telemetry & Physics Prediction Over Time</h2>
              <p class="card-subtitle">Solid lines show actual vs expected output; amber points highlight flagged investigation candidates</p>
            </div>
            <div class="chart-range-toolbar">
              <button class="btn-range active" data-range="all">All</button>
              <button class="btn-range" data-range="24h">Last 24h</button>
              <button class="btn-range" data-range="7d">Last 7d</button>
            </div>
          </div>
          <div style="height: 320px; position: relative;">
            <canvas id="historical-timeseries-chart"></canvas>
          </div>
        </div>

        <!-- Flagged Rows Table Card -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 class="card-title">Flagged Telemetry Table (Investigation Candidates)</h2>
              <p class="card-subtitle">Rows exceeding model-calibrated deviation bounds. Click any row to inspect.</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="text" id="table-search-input" class="form-control" placeholder="Search by time or type..." style="width: 220px; padding: 6px 12px; font-size: 12px;">
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table" id="flagged-data-table">
              <thead>
                <tr>
                  <th style="cursor: pointer;" data-sort="t">Timestamp ⇕</th>
                  <th style="cursor: pointer;" data-sort="plant">Facility ⇕</th>
                  <th style="cursor: pointer; text-align: right;" data-sort="actual_kw">Actual (kW) ⇕</th>
                  <th style="cursor: pointer; text-align: right;" data-sort="expected_kw">Expected (kW) ⇕</th>
                  <th style="cursor: pointer; text-align: right;" data-sort="residual_kw">Residual ⇕</th>
                  <th style="cursor: pointer; text-align: right;" data-sort="pct_deviation">Gap % ⇕</th>
                  <th style="text-align: right;">Irradiation</th>
                  <th style="text-align: right;">Module Temp</th>
                  <th>Flag Classification</th>
                </tr>
              </thead>
              <tbody id="flagged-table-body">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 12px; color: var(--text-muted);">
            <div id="table-page-info">Showing 1 to 15 of -- entries</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btn-page-prev" class="btn btn-secondary" style="padding: 4px 10px;">Previous</button>
              <button type="button" id="btn-page-next" class="btn btn-secondary" style="padding: 4px 10px;">Next</button>
            </div>
          </div>

          <div class="disclaimer-card" style="margin-top: 20px;">
            <span class="disclaimer-icon">ℹ️</span>
            <div>
              <strong>Investigation Protocol:</strong> Rows in this table represent investigation candidates, not equipment faults. They flag moments where generation deviated statistically from typical weather-driven performance.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setupDropzone(container);
  setupControls(container);

  // If last analysis exists in state, load it automatically
  const lastId = state.get('lastAnalysisId');
  if (lastId) {
    loadAnalysisById(lastId);
  }
}

function setupDropzone(container) {
  const dropzone = container.querySelector('#upload-dropzone');
  const fileInput = container.querySelector('#csv-file-input');
  const demoBtn = container.querySelector('#btn-use-demo');

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFileUpload(file);
  });

  demoBtn.addEventListener('click', async () => {
    demoBtn.disabled = true;
    demoBtn.textContent = '⏳ Processing demo analysis...';
    try {
      const tariff = parseFloat(document.getElementById('history-tariff-input')?.value || 6.0);
      const k = parseFloat(document.getElementById('history-k-slider')?.value || 3.5);
      const res = await api.getDemoAnalysis(tariff, k);
      handleAnalysisLoaded(res);
      showToast('Demo dataset loaded successfully', 'info');
    } catch (err) {
      showToast(`Demo analysis failed: ${err.message}`, 'error');
    } finally {
      demoBtn.disabled = false;
      demoBtn.textContent = '⚡ Run with Demo Dataset';
    }
  });
}

async function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please select a valid .csv file', 'error');
    return;
  }
  const tariff = parseFloat(document.getElementById('history-tariff-input')?.value || 6.0);
  const k = parseFloat(document.getElementById('history-k-slider')?.value || 3.5);

  showToast(`Uploading ${file.name}...`, 'info');
  try {
    const res = await api.uploadCsv(file, tariff, k);
    handleAnalysisLoaded(res);
    showToast(`Processed ${res.rows_used} rows from ${file.name}`, 'info');
  } catch (err) {
    showToast(`Upload failed: ${err.message}`, 'error');
  }
}

async function loadAnalysisById(analysisId) {
  try {
    const tariff = parseFloat(document.getElementById('history-tariff-input')?.value || 6.0);
    const k = parseFloat(document.getElementById('history-k-slider')?.value || 3.5);
    const res = await api.getAnalysis(analysisId, tariff, k);
    handleAnalysisLoaded(res);
  } catch (err) {
    console.error('Failed to reload analysis:', err);
  }
}

function handleAnalysisLoaded(data) {
  currentAnalysis = data;
  state.set('lastAnalysisId', data.analysis_id);

  // Reveal results area
  const area = document.getElementById('analysis-results-section');
  if (area) area.style.display = 'block';

  // Summary Tiles
  document.getElementById('stat-rows-used').textContent = data.rows_used.toLocaleString();
  document.getElementById('stat-rows-dropped').textContent = `${data.rows_dropped_missing} missing weather rows dropped`;
  document.getElementById('stat-flagged-count').textContent = data.summary.flagged_count.toLocaleString();
  document.getElementById('stat-flagged-pct').textContent = `${data.summary.flagged_pct.toFixed(1)}% of total readings`;

  const dates = data.date_range || [];
  if (dates.length >= 2) {
    const d1 = dates[0].split(' ')[0] || dates[0];
    const d2 = dates[1].split(' ')[0] || dates[1];
    document.getElementById('stat-date-span').textContent = `${d1} to ${d2}`;
  }

  const netKwh = data.summary.net_kwh;
  const netEl = document.getElementById('stat-net-kwh');
  if (netEl) {
    const sign = netKwh > 0 ? '+' : '';
    netEl.textContent = `${sign}${netKwh.toLocaleString()} kWh`;
    netEl.style.color = netKwh >= 0 ? 'var(--green)' : 'var(--red)';
  }

  // Download link
  const dlBtn = document.getElementById('btn-download-csv');
  if (dlBtn) dlBtn.href = `/api/analysis/${data.analysis_id}/download`;

  // Render sub-visuals
  renderDailyHeatStrip(data.daily || []);
  renderTimeSeriesChart();
  renderFlaggedTable();

  if (data.summary.flagged_count > 0) {
    pulse('alert');
  }
}

function setupControls(container) {
  const kSlider = container.querySelector('#history-k-slider');
  const kVal = container.querySelector('#history-k-val');
  const tariffInput = container.querySelector('#history-tariff-input');
  const plantFilter = container.querySelector('#history-plant-filter');
  const searchInput = container.querySelector('#table-search-input');
  const prevBtn = container.querySelector('#btn-page-prev');
  const nextBtn = container.querySelector('#btn-page-next');

  kSlider.addEventListener('input', () => {
    kVal.textContent = kSlider.value;
    scheduleRecompute();
  });

  tariffInput.addEventListener('input', scheduleRecompute);

  plantFilter.addEventListener('change', () => {
    currentScope = plantFilter.value;
    renderTimeSeriesChart();
    currentPage = 1;
    renderFlaggedTable();
  });

  container.querySelectorAll('.btn-range').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-range').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      renderTimeSeriesChart();
    });
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    currentPage = 1;
    renderFlaggedTable();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderFlaggedTable();
    }
  });

  nextBtn.addEventListener('click', () => {
    const total = getFilteredAnomalies().length;
    if (currentPage * PAGE_SIZE < total) {
      currentPage++;
      renderFlaggedTable();
    }
  });

  // Table sorting headers
  container.querySelectorAll('#flagged-data-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (sortField === field) {
        sortAsc = !sortAsc;
      } else {
        sortField = field;
        sortAsc = true;
      }
      renderFlaggedTable();
    });
  });
}

function scheduleRecompute() {
  if (!currentAnalysis?.analysis_id) return;
  clearTimeout(debounceRecompute);
  debounceRecompute = setTimeout(async () => {
    const k = parseFloat(document.getElementById('history-k-slider')?.value || 3.5);
    const tariff = parseFloat(document.getElementById('history-tariff-input')?.value || 6.0);
    try {
      const res = await api.getAnalysis(currentAnalysis.analysis_id, tariff, k);
      handleAnalysisLoaded(res);
      showToast('Recomputed bounds and financial balance', 'info');
    } catch (err) {
      showToast(`Recompute failed: ${err.message}`, 'error');
    }
  }, 400);
}

function renderDailyHeatStrip(dailyData) {
  const container = document.getElementById('heat-strip-wrapper');
  if (!container) return;

  if (dailyData.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No daily data available</div>';
    return;
  }

  // Group by date
  const dateMap = {};
  dailyData.forEach((d) => {
    dateMap[d.date] = (dateMap[d.date] || 0) + d.flagged;
  });

  let html = '';
  Object.keys(dateMap).sort().forEach((dateStr) => {
    const count = dateMap[dateStr];
    let cls = 'heat-strip-0';
    if (count > 0 && count <= 5) cls = 'heat-strip-low';
    if (count > 5) cls = 'heat-strip-high';

    const shortDate = dateStr.slice(5); // MM-DD
    html += `
      <div class="heat-strip-item ${cls}" title="${dateStr}: ${count} flagged readings">
        <div>${count}</div>
        <div style="font-size: 9px; opacity: 0.7;">${shortDate}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderTimeSeriesChart() {
  const canvas = document.getElementById('historical-timeseries-chart');
  if (!canvas || !currentAnalysis?.series) return;

  let pts = currentAnalysis.series;
  if (currentScope !== 'all') {
    pts = pts.filter((p) => p.plant === currentScope);
  }

  if (currentRange === '24h') {
    pts = pts.slice(-96);
  } else if (currentRange === '7d') {
    pts = pts.slice(-96 * 7);
  }

  const labels = pts.map((p) => p.t.slice(5, 16)); // MM-DD HH:MM
  const actuals = pts.map((p) => p.actual_kw);
  const expecteds = pts.map((p) => p.expected_kw);

  const flaggedScatter = pts.map((p) => (p.flagged ? p.actual_kw : null));

  if (timeSeriesChart) timeSeriesChart.destroy();

  timeSeriesChart = createLineChart(
    canvas.getContext('2d'),
    labels,
    [
      {
        label: 'Actual AC Power (kW)',
        data: actuals,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.05)',
        tension: 0.2,
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: 'Physics Expected (kW)',
        data: expecteds,
        borderColor: '#3fb950',
        borderDash: [4, 4],
        tension: 0.2,
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: 'Flagged Candidate (kW)',
        data: flaggedScatter,
        borderColor: '#f2cc60',
        backgroundColor: '#f2cc60',
        pointRadius: 4,
        showLine: false,
        pointHoverRadius: 6,
      },
    ],
    {
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { beginAtZero: true },
      },
    }
  );
}

function getFilteredAnomalies() {
  if (!currentAnalysis?.anomalies) return [];
  let list = currentAnalysis.anomalies;

  if (currentScope !== 'all') {
    list = list.filter((a) => a.plant === currentScope);
  }

  if (searchQuery) {
    list = list.filter(
      (a) =>
        a.t.toLowerCase().includes(searchQuery) ||
        a.type.toLowerCase().includes(searchQuery) ||
        a.plant.toLowerCase().includes(searchQuery)
    );
  }

  list.sort((a, b) => {
    let vA = a[sortField];
    let vB = b[sortField];
    if (vA === null || vA === undefined) vA = 0;
    if (vB === null || vB === undefined) vB = 0;
    if (vA < vB) return sortAsc ? -1 : 1;
    if (vA > vB) return sortAsc ? 1 : -1;
    return 0;
  });

  return list;
}

function renderFlaggedTable() {
  const tbody = document.getElementById('flagged-table-body');
  const pageInfo = document.getElementById('table-page-info');
  if (!tbody) return;

  const items = getFilteredAnomalies();
  const total = items.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  if (pageInfo) {
    const end = Math.min(start + PAGE_SIZE, total);
    pageInfo.textContent = total === 0 ? 'No flagged rows found' : `Showing ${start + 1} to ${end} of ${total} entries`;
  }

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No flagged rows matching filter</td></tr>`;
    return;
  }

  let html = '';
  pageItems.forEach((row) => {
    const sign = row.residual_kw > 0 ? '+' : '';
    const resColor = row.residual_kw >= 0 ? 'var(--green)' : 'var(--red)';
    const pctColor = row.pct_deviation !== null && row.pct_deviation < 0 ? 'var(--red)' : 'var(--text)';

    html += `
      <tr style="cursor: pointer;" title="Click to view details">
        <td style="font-family: var(--font-mono);">${row.t}</td>
        <td><span class="badge">${row.plant}</span></td>
        <td style="text-align: right; font-family: var(--font-mono);">${formatKw(row.actual_kw)}</td>
        <td style="text-align: right; font-family: var(--font-mono);">${formatKw(row.expected_kw)}</td>
        <td style="text-align: right; font-family: var(--font-mono); color: ${resColor};">${sign}${row.residual_kw.toFixed(1)} kW</td>
        <td style="text-align: right; font-family: var(--font-mono); color: ${pctColor};">${formatPct(row.pct_deviation)}</td>
        <td style="text-align: right; font-family: var(--font-mono);">${row.irradiation.toFixed(2)}</td>
        <td style="text-align: right; font-family: var(--font-mono);">${row.module_temp.toFixed(1)} °C</td>
        <td><span class="status-chip chip-flagged" style="font-size: 11px;">${row.type}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

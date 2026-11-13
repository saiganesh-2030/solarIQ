// Page 5: Model Performance Benchmarks
import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, renderErrorCard } from '../ui.js';
import { createBarChart, createScatterChart, createHorizontalBarChart } from '../charts.js';
import { setMode } from '../three/scene.js';

let perfData = null;
let nrmseChart = null;
let fiChart = null;
let residualScatterChart = null;
let residualHistChart = null;

export async function render(container) {
  setMode('performance');

  container.innerHTML = `
    <div class="page-enter">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Model Evaluation & Architecture Benchmarks</h1>
        <p style="color: var(--text-muted); font-size: 14px;">Cross-validation diagnostics, error distribution across baseline algorithms, and out-of-sample test results.</p>
      </div>

      <!-- Limits Note Callout Banner -->
      <div class="notice-box" style="margin-bottom: 24px; border-left-color: var(--orange);">
        <span>⚠️</span> <strong>Operational Seasonality Limit:</strong> Trained on approximately one month of data (15 May to 17 Jun 2020). Results should not be assumed to hold across monsoon or winter seasons without model recalibration.
      </div>

      <!-- Split Timeline Bar -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Chronological Dataset Split</h3>
            <p class="card-subtitle">Non-random, time-ordered sequence to prevent temporal look-ahead leakage</p>
          </div>
        </div>

        <div class="timeline-bar">
          <div class="timeline-segment timeline-train" title="Train: 15 May to 06 Jun 2020">
            Train (15 May – 06 Jun)
          </div>
          <div class="timeline-segment timeline-val" title="Validation: 07 Jun to 11 Jun 2020">
            Val (07 – 11 Jun)
          </div>
          <div class="timeline-segment timeline-test" title="Test: 12 Jun to 17 Jun 2020">
            Test (12 – 17 Jun)
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">
          <span>2020-05-15</span>
          <span>2020-06-06 | 2020-06-07</span>
          <span>2020-06-11 | 2020-06-12</span>
          <span>2020-06-17</span>
        </div>
      </div>

      <!-- Test Score Stat Cards (2 Cards) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 24px;">
        <div class="card" style="border-top: 3px solid var(--blue);">
          <div style="font-size: 12px; font-weight: 700; color: var(--blue); text-transform: uppercase;">Final Test Benchmark</div>
          <h3 style="font-size: 20px; font-weight: 800; margin: 4px 0 12px;">Plant 1 (ID: 4135001)</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted);">R² Goodness of Fit</div>
              <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--green);" id="p1-r2">0.995</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted);" title="Normalized RMSE relative to mean generation">NRMSE % ℹ️</div>
              <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--text);" id="p1-nrmse">8.8%</div>
            </div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px;" id="p1-mae-rmse">
            MAE: 270.9 kW | RMSE: 539.2 kW
          </div>
        </div>

        <div class="card" style="border-top: 3px solid var(--orange);">
          <div style="font-size: 12px; font-weight: 700; color: var(--orange); text-transform: uppercase;">Final Test Benchmark</div>
          <h3 style="font-size: 20px; font-weight: 800; margin: 4px 0 12px;">Plant 2 (ID: 4136001)</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <div style="font-size: 11px; color: var(--text-muted);">R² Goodness of Fit</div>
              <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--green);" id="p2-r2">0.882</div>
            </div>
            <div>
              <div style="font-size: 11px; color: var(--text-muted);" title="Normalized RMSE relative to mean generation">NRMSE % ℹ️</div>
              <div style="font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: var(--text);" id="p2-nrmse">42.7%</div>
            </div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px;" id="p2-mae-rmse">
            MAE: 885.9 kW | RMSE: 1,918.2 kW
          </div>
        </div>
      </div>

      <!-- Comparative Validation Experiments Table -->
      <div class="card" style="margin-bottom: 28px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">Model Experiment Matrix (6 Runs)</h2>
            <p class="card-subtitle">Comparison across Linear Regression, SVR, and Tuned Random Forest. Lowest error highlighted in green.</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="experiments-table">
            <thead>
              <tr>
                <th>Plant</th>
                <th>Model Architecture</th>
                <th style="text-align: right;" title="Mean Absolute Error in kW">MAE (kW)</th>
                <th style="text-align: right;" title="Root Mean Squared Error in kW">RMSE (kW)</th>
                <th style="text-align: right;" title="Coefficient of Determination">R²</th>
                <th style="text-align: right;" title="Normalized Root Mean Squared Error (% of mean power)">NRMSE (%) ℹ️</th>
              </tr>
            </thead>
            <tbody id="experiments-table-body">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

        <p style="font-size: 11px; color: var(--text-muted); margin-top: 12px;">
          * <strong>Why NRMSE %?</strong> Because Plant 1 and Plant 2 have vastly different generating capacities, raw RMSE is not cross-comparable. NRMSE normalizes error against facility mean output.
        </p>
      </div>

      <!-- Charts Row: NRMSE Comparison Bar Chart & Feature Importance -->
      <div class="grid-2col" style="margin-bottom: 28px;">
        <!-- NRMSE Bar Chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Normalized Error (NRMSE %) by Architecture</h3>
              <p class="card-subtitle">Lower is better. Random Forest consistently achieves lowest error.</p>
            </div>
          </div>
          <div style="height: 240px; position: relative;">
            <canvas id="nrmse-comparison-chart"></canvas>
          </div>
        </div>

        <!-- Hyperparameters & Tuning Specifications -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Tuned Hyperparameters</h3>
              <p class="card-subtitle">GridSearchCV optimized parameters per plant</p>
            </div>
          </div>
          <div class="code-block" id="hyperparams-code-block">
            Loading parameter configs...
          </div>
        </div>
      </div>

      <!-- Dynamic Residual & Scatter Section (if analysis available) -->
      <div class="card" id="analysis-residuals-card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Actual vs Predicted Parity & Residual Spread</h2>
            <p class="card-subtitle" id="residual-subtitle">Calculated from currently active batch analysis</p>
          </div>
          <button type="button" id="btn-load-perf-demo" class="btn btn-secondary" style="display: none;">
            Run Demo Analysis for Residuals
          </button>
        </div>

        <div class="grid-2col" id="residual-charts-grid" style="margin-top: 14px;">
          <div style="height: 250px; position: relative;">
            <canvas id="perf-parity-scatter"></canvas>
          </div>
          <div style="height: 250px; position: relative;">
            <canvas id="perf-residual-hist"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    perfData = await api.getModelPerformance();
    renderPerformanceDetails(container);
  } catch (err) {
    container.innerHTML = renderErrorCard(
      `Failed to load model performance: ${err.message}`,
      "window.location.reload"
    );
  }
}

function renderPerformanceDetails(container) {
  if (!perfData) return;

  // Render Test Scores
  const testScores = perfData.test_random_forest || [];
  const p1Test = testScores.find((s) => s.Plant === 'Plant 1');
  const p2Test = testScores.find((s) => s.Plant === 'Plant 2');

  if (p1Test) {
    document.getElementById('p1-r2').textContent = p1Test.R2.toFixed(3);
    document.getElementById('p1-nrmse').textContent = `${p1Test['NRMSE_%'].toFixed(1)}%`;
    document.getElementById('p1-mae-rmse').textContent = `MAE: ${p1Test.MAE.toFixed(1)} kW | RMSE: ${p1Test.RMSE.toFixed(1)} kW`;
  }

  if (p2Test) {
    document.getElementById('p2-r2').textContent = p2Test.R2.toFixed(3);
    document.getElementById('p2-nrmse').textContent = `${p2Test['NRMSE_%'].toFixed(1)}%`;
    document.getElementById('p2-mae-rmse').textContent = `MAE: ${p2Test.MAE.toFixed(1)} kW | RMSE: ${p2Test.RMSE.toFixed(1)} kW`;
  }

  // Render Experiments Table
  const tableBody = document.getElementById('experiments-table-body');
  const experiments = perfData.validation_all_models || [];

  if (tableBody && experiments.length > 0) {
    let html = '';
    // Highlight best per plant
    ['Plant 1', 'Plant 2'].forEach((plant) => {
      const plantRows = experiments.filter((e) => e.Plant === plant);
      const minMae = Math.min(...plantRows.map((r) => r.MAE));
      const minRmse = Math.min(...plantRows.map((r) => r.RMSE));
      const maxR2 = Math.max(...plantRows.map((r) => r.R2));
      const minNrmse = Math.min(...plantRows.map((r) => r['NRMSE_%']));

      plantRows.forEach((r) => {
        const isBestMae = r.MAE === minMae;
        const isBestRmse = r.RMSE === minRmse;
        const isBestR2 = r.R2 === maxR2;
        const isBestNrmse = r['NRMSE_%'] === minNrmse;

        html += `
          <tr>
            <td><strong>${r.Plant}</strong></td>
            <td>${r.Model} ${r.Model === 'Random Forest' ? '⭐' : ''}</td>
            <td style="text-align: right; font-family: var(--font-mono);"><span class="${isBestMae ? 'metric-best' : ''}">${r.MAE.toFixed(1)}</span></td>
            <td style="text-align: right; font-family: var(--font-mono);"><span class="${isBestRmse ? 'metric-best' : ''}">${r.RMSE.toFixed(1)}</span></td>
            <td style="text-align: right; font-family: var(--font-mono);"><span class="${isBestR2 ? 'metric-best' : ''}">${r.R2.toFixed(4)}</span></td>
            <td style="text-align: right; font-family: var(--font-mono);"><span class="${isBestNrmse ? 'metric-best' : ''}">${r['NRMSE_%'].toFixed(1)}%</span></td>
          </tr>
        `;
      });
    });
    tableBody.innerHTML = html;
  }

  // Render NRMSE Bar Chart
  const nrmseCanvas = document.getElementById('nrmse-comparison-chart');
  if (nrmseCanvas && experiments.length > 0) {
    const models = ['Linear Regression', 'SVR', 'Random Forest'];
    const p1Nrmse = models.map((m) => {
      const match = experiments.find((e) => e.Plant === 'Plant 1' && e.Model === m);
      return match ? match['NRMSE_%'] : 0;
    });
    const p2Nrmse = models.map((m) => {
      const match = experiments.find((e) => e.Plant === 'Plant 2' && e.Model === m);
      return match ? match['NRMSE_%'] : 0;
    });

    if (nrmseChart) nrmseChart.destroy();
    nrmseChart = createBarChart(
      nrmseCanvas.getContext('2d'),
      models,
      [
        {
          label: 'Plant 1 NRMSE %',
          data: p1Nrmse,
          backgroundColor: '#58a6ff',
        },
        {
          label: 'Plant 2 NRMSE %',
          data: p2Nrmse,
          backgroundColor: '#f0883e',
        },
      ],
      {
        scales: {
          y: {
            title: { display: true, text: 'NRMSE (%)' },
            ticks: { callback: (v) => v + '%' },
          },
        },
      }
    );
  }

  // Render Hyperparameters Code Block
  const codeBlock = document.getElementById('hyperparams-code-block');
  if (codeBlock && perfData.best_params) {
    codeBlock.innerHTML = `
// Optimized Estimator Configurations (Random Forest)
{
  "Plant 1": {
    "n_estimators": 100,
    "max_depth": ${perfData.best_params['Plant 1']?.max_depth || 'null (unrestricted)'},
    "min_samples_leaf": ${perfData.best_params['Plant 1']?.min_samples_leaf || 3},
    "n_jobs": -1,
    "random_state": 42
  },
  "Plant 2": {
    "n_estimators": 100,
    "max_depth": ${perfData.best_params['Plant 2']?.max_depth || 'null (unrestricted)'},
    "min_samples_leaf": ${perfData.best_params['Plant 2']?.min_samples_leaf || 5},
    "n_jobs": -1,
    "random_state": 42
  }
}
    `.trim();
  }

  // Check if an analysis exists for parity & residual charts
  checkResidualCharts(container);
}

async function checkResidualCharts(container) {
  const lastId = state.get('lastAnalysisId');
  const demoBtn = container.querySelector('#btn-load-perf-demo');
  const subtitle = container.querySelector('#residual-subtitle');

  if (!lastId) {
    if (demoBtn) {
      demoBtn.style.display = 'inline-flex';
      demoBtn.addEventListener('click', async () => {
        demoBtn.disabled = true;
        demoBtn.textContent = 'Running demo...';
        try {
          const res = await api.getDemoAnalysis(6.0, 3.5);
          state.set('lastAnalysisId', res.analysis_id);
          renderResidualVisuals(res);
          demoBtn.style.display = 'none';
        } catch (e) {
          showToast('Failed to load demo: ' + e.message, 'error');
        } finally {
          demoBtn.disabled = false;
        }
      });
    }
    if (subtitle) subtitle.textContent = 'No active analysis found. Click button to compute from demo dataset.';
    return;
  }

  try {
    const analysis = await api.getAnalysis(lastId, 6.0, 3.5);
    renderResidualVisuals(analysis);
  } catch (err) {
    if (demoBtn) demoBtn.style.display = 'inline-flex';
  }
}

function renderResidualVisuals(analysis) {
  if (!analysis?.series) return;
  const pts = analysis.series;

  // 1. Parity Scatter: Actual vs Predicted
  const parityCanvas = document.getElementById('perf-parity-scatter');
  if (parityCanvas) {
    const dataPoints = pts.slice(0, 1000).map((p) => ({ x: p.expected_kw, y: p.actual_kw }));
    if (residualScatterChart) residualScatterChart.destroy();
    residualScatterChart = createScatterChart(
      parityCanvas.getContext('2d'),
      [
        {
          label: 'Telemetry Readings (kW)',
          data: dataPoints,
          backgroundColor: 'rgba(88, 166, 255, 0.5)',
          pointRadius: 3,
        },
      ],
      {
        plugins: {
          title: { display: true, text: 'Actual vs Expected Parity Plot', color: '#e6edf3' },
        },
        scales: {
          x: { title: { display: true, text: 'Expected AC (kW)' } },
          y: { title: { display: true, text: 'Actual AC (kW)' } },
        },
      }
    );
  }

  // 2. Residual Histogram (Binned residual distribution)
  const histCanvas = document.getElementById('perf-residual-hist');
  if (histCanvas) {
    const residuals = pts.map((p) => p.residual_kw);
    // 10 bins
    const minRes = Math.min(...residuals);
    const maxRes = Math.max(...residuals);
    const binCount = 12;
    const step = (maxRes - minRes) / binCount;
    const bins = Array(binCount).fill(0);
    const binLabels = [];

    for (let i = 0; i < binCount; i++) {
      const bMin = Math.round(minRes + i * step);
      const bMax = Math.round(minRes + (i + 1) * step);
      binLabels.push(`${bMin}..${bMax}`);
    }

    residuals.forEach((r) => {
      let idx = Math.floor((r - minRes) / step);
      if (idx >= binCount) idx = binCount - 1;
      if (idx >= 0) bins[idx]++;
    });

    if (residualHistChart) residualHistChart.destroy();
    residualHistChart = createBarChart(
      histCanvas.getContext('2d'),
      binLabels,
      [
        {
          label: 'Residual Frequency Count',
          data: bins,
          backgroundColor: 'rgba(240, 136, 62, 0.65)',
        },
      ],
      {
        plugins: {
          title: { display: true, text: 'Residual Error Distribution (Actual - Expected)', color: '#e6edf3' },
        },
        scales: {
          x: { ticks: { maxTicksLimit: 6 } },
          y: { beginAtZero: true },
        },
      }
    );
  }
}

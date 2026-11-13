// Home Landing Page
import { api } from '../api.js';

export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <section class="hero-section">
        <div class="hero-badge">
          <span>⚡ Random Forest AI Engine</span>
        </div>
        <h1 class="hero-title">SolarIQ: know what your solar plant should produce</h1>
        <p class="hero-subtitle">
          Real-time expected AC power forecasting and deviation analysis. Identify underperforming intervals, quantify monetary impact, and explore environmental drivers.
        </p>
        <div class="hero-actions">
          <a href="#/prediction" class="btn btn-primary" style="padding: 12px 24px; font-size: 14px;">Try a Prediction →</a>
          <a href="#/historical" class="btn btn-secondary" style="padding: 12px 24px; font-size: 14px;">Run Demo Analysis</a>
        </div>
      </section>

      <!-- Live Stats Grid -->
      <div class="stat-grid" id="home-stats">
        <div class="stat-tile">
          <div class="stat-value" id="stat-plants">2</div>
          <div class="stat-label">Active Solar Plants</div>
        </div>
        <div class="stat-tile">
          <div class="stat-value" id="stat-period">33 Days</div>
          <div class="stat-label">Training Period (May-Jun 2020)</div>
        </div>
        <div class="stat-tile">
          <div class="stat-value" id="stat-accuracy" style="color: var(--green);">0.995 R²</div>
          <div class="stat-label">Plant 1 Accuracy (RF)</div>
        </div>
      </div>

      <!-- Feature Cards Grid -->
      <div class="features-grid">
        <a href="#/prediction" class="feature-card">
          <div class="feature-icon-wrapper">🔮</div>
          <div>
            <h3 class="feature-title">Generation Prediction</h3>
            <p class="feature-desc">Input weather conditions (irradiation, temperatures, time) to simulate expected AC generation with live 3D sun tracking.</p>
          </div>
          <div class="feature-arrow">Explore predictions →</div>
        </a>

        <a href="#/anomaly" class="feature-card">
          <div class="feature-icon-wrapper">🔍</div>
          <div>
            <h3 class="feature-title">Anomaly Detection</h3>
            <p class="feature-desc">Compare observed generation against expected baselines. Statistically flag candidates requiring operational review.</p>
          </div>
          <div class="feature-arrow">Check deviations →</div>
        </a>

        <a href="#/weather" class="feature-card">
          <div class="feature-icon-wrapper">☀️</div>
          <div>
            <h3 class="feature-title">Weather Analysis</h3>
            <p class="feature-desc">Interactive correlation matrices and scatter plots illustrating associations between irradiation, module heat, and output.</p>
          </div>
          <div class="feature-arrow">View correlations →</div>
        </a>

        <a href="#/historical" class="feature-card">
          <div class="feature-icon-wrapper">📊</div>
          <div>
            <h3 class="feature-title">Historical Time-Series</h3>
            <p class="feature-desc">Upload 15-minute plant CSVs to run batch evaluations, filter by deviation severity, and download report CSVs.</p>
          </div>
          <div class="feature-arrow">Analyze dataset →</div>
        </a>

        <a href="#/performance" class="feature-card">
          <div class="feature-icon-wrapper">📈</div>
          <div>
            <h3 class="feature-title">Model Performance</h3>
            <p class="feature-desc">Compare Linear Regression, SVR, and Random Forest benchmark metrics (MAE, RMSE, NRMSE%) and feature importances.</p>
          </div>
          <div class="feature-arrow">Inspect metrics →</div>
        </a>

        <a href="#/financial" class="feature-card">
          <div class="feature-icon-wrapper">💰</div>
          <div>
            <h3 class="feature-title">Financial Impact</h3>
            <p class="feature-desc">Translate generation shortfalls into estimated monetary impact using configurable energy tariffs.</p>
          </div>
          <div class="feature-arrow">Calculate impact →</div>
        </a>
      </div>
    </div>
  `;

  // Asynchronously load real stats
  try {
    const meta = await api.getMeta();
    if (meta && meta.plants) {
      document.getElementById('stat-plants').textContent = Object.keys(meta.plants).length;
    }
  } catch (e) {}

  try {
    const perf = await api.getModelPerformance();
    if (perf && perf.test_random_forest) {
      const p1 = perf.test_random_forest.find(x => x.Plant === 'Plant 1');
      if (p1) {
        document.getElementById('stat-accuracy').textContent = `${p1.R2.toFixed(3)} R²`;
      }
    }
  } catch (e) {}
}


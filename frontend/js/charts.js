// Chart.js Theme Configurations & Helpers
/* global Chart */

function destroyExistingChart(ctx) {
  if (typeof Chart === 'undefined' || !ctx) return;
  const canvas = typeof ctx === 'string'
    ? document.getElementById(ctx)
    : (ctx.canvas || (ctx.tagName === 'CANVAS' ? ctx : null));
  if (canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) {
      try {
        existing.destroy();
      } catch (e) {
        console.warn('Error destroying existing chart instance:', e);
      }
    }
  }
}

export function configureChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#8b949e';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;

  if (Chart.defaults.plugins?.tooltip) {
    Chart.defaults.plugins.tooltip.backgroundColor = '#161b22';
    Chart.defaults.plugins.tooltip.borderColor = '#30363d';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = '#e6edf3';
    Chart.defaults.plugins.tooltip.bodyColor = '#8b949e';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  // Safe grid styling for Chart.js scales
  if (Chart.defaults.scales) {
    ['linear', 'category', 'time'].forEach((type) => {
      if (Chart.defaults.scales[type]?.grid) {
        Chart.defaults.scales[type].grid.color = '#21262d';
      }
    });
  }
}

export function createLineChart(ctx, labels, datasets, options = {}) {
  destroyExistingChart(ctx);
  const { plugins, scales, ...rest } = options;
  const optScales = scales || {};

  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        ...(plugins || {}),
      },
      scales: {
        x: {
          grid: { color: '#21262d' },
          ...(optScales.x || {}),
        },
        y: {
          grid: { color: '#21262d' },
          ...(optScales.y || {}),
        },
      },
      ...rest,
    },
  });
}

export function createBarChart(ctx, labels, datasets, options = {}) {
  destroyExistingChart(ctx);
  const { plugins, scales, ...rest } = options;
  const optScales = scales || {};

  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        ...(plugins || {}),
      },
      scales: {
        x: {
          grid: { color: '#21262d' },
          ...(optScales.x || {}),
        },
        y: {
          grid: { color: '#21262d' },
          ...(optScales.y || {}),
        },
      },
      ...rest,
    },
  });
}

export function createScatterChart(ctx, datasets, options = {}) {
  destroyExistingChart(ctx);
  const { plugins, scales, ...rest } = options;
  const optScales = scales || {};

  return new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        ...(plugins || {}),
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: '#21262d' },
          ...(optScales.x || {}),
        },
        y: {
          grid: { color: '#21262d' },
          ...(optScales.y || {}),
        },
      },
      ...rest,
    },
  });
}

export function createHorizontalBarChart(ctx, labels, datasets, options = {}) {
  destroyExistingChart(ctx);
  const { plugins, scales, ...rest } = options;
  const optScales = scales || {};

  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
        ...(plugins || {}),
      },
      scales: {
        x: {
          grid: { color: '#21262d' },
          ...(optScales.x || {}),
        },
        y: {
          grid: { color: '#21262d' },
          ...(optScales.y || {}),
        },
      },
      ...rest,
    },
  });
}

export function createDoughnutChart(ctx, labels, datasets, options = {}) {
  destroyExistingChart(ctx);
  const { plugins, ...rest } = options;

  return new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } },
        ...(plugins || {}),
      },
      ...rest,
    },
  });
}

// Chart.js Theme Configurations & Helpers
/* global Chart */

export function configureChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#8b949e';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;

  Chart.defaults.plugins.tooltip.backgroundColor = '#161b22';
  Chart.defaults.plugins.tooltip.borderColor = '#30363d';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#e6edf3';
  Chart.defaults.plugins.tooltip.bodyColor = '#8b949e';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  Chart.defaults.scale.grid = {
    color: '#21262d',
    borderColor: '#30363d',
  };
}

export function createLineChart(ctx, labels, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      },
      ...options,
    },
  });
}

export function createBarChart(ctx, labels, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      },
      ...options,
    },
  });
}

export function createScatterChart(ctx, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
        },
      },
      ...options,
    },
  });
}

export function createHorizontalBarChart(ctx, labels, datasets, options = {}) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      },
      ...options,
    },
  });
}



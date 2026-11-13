// Centralized API Client
const BASE_URL = window.location.origin;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData.detail) errorMsg = errorData.detail;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

export const api = {
  getHealth: () => request('/api/health'),
  getMeta: () => request('/api/meta'),
  predictPower: (data) => request('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getTypicalDay: (plantId) => request(`/api/typical-day?plant_id=${plantId}`),
  checkAnomaly: (data) => request('/api/anomaly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  uploadCsv: (file, tariff = 6.0, k = 3.5) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/upload?tariff=${tariff}&k=${k}`, {
      method: 'POST',
      body: formData,
    });
  },
  getDemoAnalysis: (tariff = 6.0, k = 3.5) =>
    request(`/api/demo-analysis?tariff=${tariff}&k=${k}`),
  getAnalysis: (analysisId, tariff = 6.0, k = 3.5) =>
    request(`/api/analysis/${analysisId}?tariff=${tariff}&k=${k}`),
  getWeatherAnalysis: () => request('/api/weather-analysis'),
  getModelPerformance: () => request('/api/model-performance'),
  convertFinancial: (data) => request('/api/financial/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};

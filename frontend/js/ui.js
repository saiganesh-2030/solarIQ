// UI Component and Notification Helpers

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

export function formatKw(val) {
  if (val === null || val === undefined || isNaN(val)) return 'n/a';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kW';
}

export function formatKwh(val) {
  if (val === null || val === undefined || isNaN(val)) return 'n/a';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kWh';
}

export function formatCurrency(val, symbol = '₹') {
  if (val === null || val === undefined || isNaN(val)) return 'n/a';
  return symbol + Number(val).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return 'n/a';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return sign + num.toFixed(1) + '%';
}

export function animateCountUp(element, endVal, duration = 800, decimals = 1) {
  if (!element) return;
  const startVal = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentVal = startVal + (endVal - startVal) * ease;
    element.textContent = currentVal.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

export function renderErrorCard(message, onRetry) {
  return `
    <div class="card" style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 36px; margin-bottom: 14px;">⚠️</div>
      <h3 style="margin-bottom: 8px;">Unable to load data</h3>
      <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 13px;">${message}</p>
      ${onRetry ? `<button class="btn btn-secondary" onclick="(${onRetry})()">Try Again</button>` : ''}
    </div>
  `;
}

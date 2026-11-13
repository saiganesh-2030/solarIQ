export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="card">
        <h2 class="card-title">🔍 Performance Deviation & Anomaly Detection</h2>
        <p class="card-subtitle">Detect underperforming output and classify statistical deviation severity.</p>
        <div style="margin-top: 24px; padding: 20px; background: var(--surface-2); border-radius: var(--radius-md);">
          <p style="color: var(--text-muted);">Page module ready for Phase 7 threshold sliders and anomaly classification.</p>
        </div>
      </div>
    </div>
  `;
}

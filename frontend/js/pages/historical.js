export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="card">
        <h2 class="card-title">📊 Historical Time-Series Evaluation</h2>
        <p class="card-subtitle">Batch evaluate 15-minute plant CSV files with dynamic threshold controls.</p>
        <div style="margin-top: 24px; padding: 20px; background: var(--surface-2); border-radius: var(--radius-md);">
          <p style="color: var(--text-muted);">Page module ready for Phase 8 drag-and-drop CSV upload and time-series charts.</p>
        </div>
      </div>
    </div>
  `;
}


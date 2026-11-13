export async function render(container) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="card">
        <h2 class="card-title">🔮 Solar Power Prediction</h2>
        <p class="card-subtitle">Forecast AC generation based on solar irradiation, ambient and module temperatures.</p>
        <div style="margin-top: 24px; padding: 20px; background: var(--surface-2); border-radius: var(--radius-md);">
          <p style="color: var(--text-muted);">Page module ready for Phase 7 interactive form and gauge buildout.</p>
        </div>
      </div>
    </div>
  `;
}

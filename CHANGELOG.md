# Changelog

All notable changes to the SolarIQ project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-13

### Added
- **Machine Learning Core:**
  - Dedicated tuned Random Forest regressors for Plant 1 (`4135001`) and Plant 2 (`4136001`).
  - Model bundle loading with robust anomaly threshold parameters ($K = 3.5$ default).
  - Chronological time-series train/validation/test split evaluation.
- **FastAPI Backend (`/api/*`):**
  - Prediction endpoint (`POST /api/predict`) with negative power clipping.
  - Typical day 96-point diurnal curve endpoint (`GET /api/typical-day`).
  - Single-point anomaly detection endpoint (`POST /api/anomaly`).
  - Batch CSV telemetry upload and processing (`POST /api/upload`).
  - One-click demo analysis endpoint (`GET /api/demo-analysis`).
  - In-memory dynamic recomputation endpoint (`GET /api/analysis/{id}`).
  - Formatted CSV results download (`GET /api/analysis/{id}/download`).
  - Meteorological driver analytics (`GET /api/weather-analysis`).
  - Model evaluation metrics (`GET /api/model-performance`).
  - Point financial conversion calculator (`POST /api/financial/convert`).
  - Sample template CSV download (`GET /api/sample-csv`).
- **Modern Responsive Frontend:**
  - Interactive Three.js 3D solar array with procedural cell textures, sun positioning, and celestial arc lighting.
  - Dark GitHub-inspired design system with light-theme toggle and custom tokens.
  - Native client-side hash router supporting 7 routes (`#/`, `#/prediction`, `#/anomaly`, `#/weather`, `#/historical`, `#/performance`, `#/financial`).
  - Interactive Chart.js visualizations: typical day diurnal curve, dual time-series, NRMSE comparison, daily stacked shortfall bars, and composition donut.
  - Paginated, searchable, and sortable flagged telemetry table.
  - Full mobile responsiveness ($\le 600\text{px}$ bottom tab bar, responsive tables).
  - WCAG AA accessibility compliance with focus indicators and skip-to-content anchor.
- **Automated Testing & Postman:**
  - 17 Pytest unit and integration tests covering all routes and edge cases.
  - Comprehensive Postman Collection (v2.1) and Local Environment definition.
  - Complete End-to-End Test Report in `docs/TEST_REPORT.md`.
  - GitHub Actions CI workflow in `.github/workflows/ci.yml`.

# SolarIQ API Documentation

REST API documentation for the Solar Power Generation Prediction and Performance Deviation Analysis platform.

Base URL: `http://localhost:8000`

---

## 1. Endpoints Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and loaded ML models |
| `GET` | `/api/meta` | Plant mappings, feature names, dataset splits, and threshold parameters |
| `POST` | `/api/predict` | Expected generation (kW) prediction from weather features |
| `GET` | `/api/typical-day` | 96-slot 24-hour diurnal curve (15-min intervals) |
| `POST` | `/api/anomaly` | Single reading actual vs. expected anomaly detection |
| `POST` | `/api/upload` | Multipart CSV upload for bulk time-series deviation analysis |
| `GET` | `/api/demo-analysis` | One-click demo analysis using built-in test dataset |
| `GET` | `/api/analysis/{analysis_id}` | Dynamic recalculation with customized $K$ or tariff |
| `GET` | `/api/analysis/{analysis_id}/download` | Download processed results as CSV |
| `GET` | `/api/sample-csv` | Download sample CSV template |
| `GET` | `/api/weather-analysis` | Historical correlations, scatter data, and hourly averages |
| `GET` | `/api/model-performance` | Validation/test evaluation metrics and feature importances |
| `POST` | `/api/financial/convert` | Ad-hoc power delta to energy and revenue converter |

---

## 2. Request & Response Examples

### 2.1 Health Check
`GET /api/health`
```json
{
  "status": "ok",
  "model_loaded": true,
  "models": ["Plant 1", "Plant 2"]
}
```

### 2.2 Predict Power
`POST /api/predict`
```json
{
  "plant_id": 4135001,
  "irradiation": 0.8,
  "ambient_temp": 30.0,
  "module_temp": 50.0,
  "hour": 12,
  "minute": 0
}
```
Response `200 OK`:
```json
{
  "plant_id": 4135001,
  "plant_name": "Plant 1",
  "expected_kw": 22849.91,
  "model": "Plant 1"
}
```

### 2.3 Anomaly Analysis
`POST /api/anomaly`
```json
{
  "plant_id": 4136001,
  "irradiation": 0.49,
  "ambient_temp": 31.2,
  "module_temp": 39.9,
  "hour": 13,
  "minute": 0,
  "actual_kw": 3078.35,
  "k": 3.5
}
```
Response `200 OK`:
```json
{
  "plant_name": "Plant 2",
  "expected_kw": 12185.45,
  "actual_kw": 3078.35,
  "residual_kw": -9107.1,
  "pct_deviation": -74.74,
  "threshold_pct": [-32.3, 46.9],
  "k": 3.5,
  "flagged": true,
  "direction": "Below expected",
  "type": "Below expected",
  "disclaimer": "This is an investigation candidate, not a confirmed equipment fault."
}
```

### 2.4 Typical Day Profile
`GET /api/typical-day?plant_id=4135001`
Response `200 OK`:
```json
[
  {
    "time": "00:00",
    "expected_kw": 0.0,
    "irradiation": 0.0,
    "ambient_temp": 25.1,
    "module_temp": 22.8
  },
  {
    "time": "12:00",
    "expected_kw": 23410.5,
    "irradiation": 0.782,
    "ambient_temp": 32.4,
    "module_temp": 54.1
  }
]
```

### 2.5 Financial Conversion
`POST /api/financial/convert`
```json
{
  "expected_kw": 1000.0,
  "actual_kw": 800.0,
  "tariff": 6.0,
  "interval_hours": 0.25
}
```
Response `200 OK`:
```json
{
  "expected_kwh": 250.0,
  "actual_kwh": 200.0,
  "shortfall_kwh": 50.0,
  "shortfall_money": 300.0,
  "note": "Estimate only; includes normal model error."
}
```

---

## 3. Postman Collection & Automated Testing

The repository includes a complete Postman collection and local environment configuration in the `postman/` directory:
* Collection: `postman/SolarIQ.postman_collection.json` (v2.1)
* Environment: `postman/SolarIQ.local.postman_environment.json`

### 3.1 Running via Postman UI
1. Open Postman, click **Import**, and select both files from `postman/`.
2. Select the **SolarIQ Local Environment** in the top-right environment selector.
3. Ensure the backend server is running (`http://localhost:8000`).
4. In the collection menu, click **Run collection** to run all tests in sequence.
5. `analysis_id` is dynamically captured from `/api/demo-analysis` and automatically supplied to `/api/analysis/{{analysis_id}}` and the download endpoints.

### 3.2 Running via Newman (CLI)
Make sure the backend is active, then execute:
```bash
npx newman run postman/SolarIQ.postman_collection.json -e postman/SolarIQ.local.postman_environment.json
```


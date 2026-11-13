import json
from fastapi import APIRouter, HTTPException
from ..config import ARTIFACT_DIR, LIMITS_NOTE

router = APIRouter(tags=["Model Performance"])

_perf_cache = None

@router.get("/model-performance")
def get_model_performance():
    global _perf_cache
    if _perf_cache is None:
        metrics_path = ARTIFACT_DIR / "model_metrics.json"
        fi_path = ARTIFACT_DIR / "feature_importance.json"

        if not metrics_path.exists():
            raise HTTPException(status_code=500, detail="model_metrics.json not found.")

        with open(metrics_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if fi_path.exists():
            with open(fi_path, "r", encoding="utf-8") as f:
                data["feature_importance"] = json.load(f)
        else:
            data["feature_importance"] = {}

        data["limits_note"] = LIMITS_NOTE
        _perf_cache = data

    return _perf_cache


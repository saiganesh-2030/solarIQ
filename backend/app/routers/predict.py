import json
from fastapi import APIRouter
from ..schemas import PredictRequest, PredictResponse, MetaResponse
from ..services.model_service import model_service
from ..config import (
    ARTIFACT_DIR,
    DEFAULT_TARIFF,
    INTERVAL_HOURS,
    CURRENCY,
    CURRENCY_SYMBOL,
    LIMITS_NOTE
)

router = APIRouter(tags=["Prediction"])

@router.get("/meta", response_model=MetaResponse)
def get_metadata():
    metrics_path = ARTIFACT_DIR / "model_metrics.json"
    split_info = {}
    if metrics_path.exists():
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics_data = json.load(f)
            split_info = metrics_data.get("split", {})

    return MetaResponse(
        plants=model_service.plant_flag,
        features=model_service.features,
        split=split_info,
        thresholds=model_service.thr_pct,
        defaults={
            "k": model_service.default_k,
            "tariff": DEFAULT_TARIFF,
            "interval_hours": INTERVAL_HOURS,
            "min_pred_kw": model_service.min_pred_kw,
            "currency": CURRENCY,
            "currency_symbol": CURRENCY_SYMBOL,
        },
        limits_note=LIMITS_NOTE,
    )

@router.post("/predict", response_model=PredictResponse)
def predict_power(req: PredictRequest):
    plant_name = model_service.get_plant_name(req.plant_id)
    expected_kw = model_service.predict(
        plant_id=req.plant_id,
        irradiation=req.irradiation,
        ambient_temp=req.ambient_temp,
        module_temp=req.module_temp,
        hour=req.hour,
        minute=req.minute,
    )
    return PredictResponse(
        plant_id=req.plant_id,
        plant_name=plant_name,
        expected_kw=expected_kw,
        model=plant_name,
    )

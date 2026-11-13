import json
import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException
from ..schemas import PredictRequest, PredictResponse, MetaResponse, TypicalDayPoint
from ..services.model_service import model_service
from ..config import (
    ARTIFACT_DIR,
    DATA_DIR,
    DEFAULT_TARIFF,
    INTERVAL_HOURS,
    CURRENCY,
    CURRENCY_SYMBOL,
    LIMITS_NOTE
)

router = APIRouter(tags=["Prediction"])

_typical_day_cache: Dict[int, List[Dict[str, Any]]] = {}
_solar_clean_df: Optional[pd.DataFrame] = None

def _get_solar_clean_df() -> pd.DataFrame:
    global _solar_clean_df
    if _solar_clean_df is None:
        clean_path = DATA_DIR / "processed" / "solar_clean.csv"
        if not clean_path.exists():
            clean_path = ARTIFACT_DIR / "solar_clean.csv"
        if not clean_path.exists():
            raise HTTPException(status_code=500, detail="solar_clean.csv dataset not found.")
        df = pd.read_csv(clean_path)
        if "DATE_TIME" in df.columns:
            df["DATE_TIME"] = pd.to_datetime(df["DATE_TIME"])
            df["HOUR"] = df["DATE_TIME"].dt.hour
            df["MINUTE"] = df["DATE_TIME"].dt.minute
        _solar_clean_df = df
    return _solar_clean_df

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

@router.get("/typical-day", response_model=List[TypicalDayPoint])
def get_typical_day(plant_id: int = Query(4135001, description="Plant ID")):
    plant_name = model_service.get_plant_name(plant_id)
    if plant_id in _typical_day_cache:
        return _typical_day_cache[plant_id]

    df = _get_solar_clean_df()
    p_df = df[df["PLANT_ID"] == plant_id]
    if len(p_df) == 0:
        raise HTTPException(status_code=404, detail=f"No historical data for plant_id {plant_id}")

    # Group by HOUR and MINUTE
    grouped = p_df.groupby(["HOUR", "MINUTE"]).agg(
        avg_irrad=("IRRADIATION", "mean"),
        avg_amb=("AMBIENT_TEMPERATURE", "mean"),
        avg_mod=("MODULE_TEMPERATURE", "mean")
    ).reset_index()

    slot_map = {(int(r["HOUR"]), int(r["MINUTE"])): (float(r["avg_irrad"]), float(r["avg_amb"]), float(r["avg_mod"]))
                for _, r in grouped.iterrows()}

    points = []
    for h in range(24):
        for m in (0, 15, 30, 45):
            irrad, amb, mod = slot_map.get((h, m), (0.0, 25.0, 25.0))
            kw = model_service.predict(
                plant_id=plant_id,
                irradiation=irrad,
                ambient_temp=amb,
                module_temp=mod,
                hour=h,
                minute=m
            )
            time_str = f"{h:02d}:{m:02d}"
            points.append({
                "time": time_str,
                "expected_kw": kw,
                "irradiation": round(irrad, 4),
                "ambient_temp": round(amb, 1),
                "module_temp": round(mod, 1),
            })

    _typical_day_cache[plant_id] = points
    return points

from fastapi import APIRouter
from ..schemas import AnomalyRequest, AnomalyResponse
from ..services.model_service import model_service
from ..services.anomaly_service import (
    compute_threshold,
    calculate_residual,
    calculate_pct_deviation,
    check_is_flagged,
    determine_direction,
    determine_flag_type
)
from ..config import DISCLAIMER_TEXT

router = APIRouter(tags=["Anomaly"])

@router.post("/anomaly", response_model=AnomalyResponse)
def analyze_anomaly(req: AnomalyRequest):
    plant_name = model_service.get_plant_name(req.plant_id)
    expected_kw = model_service.predict(
        plant_id=req.plant_id,
        irradiation=req.irradiation,
        ambient_temp=req.ambient_temp,
        module_temp=req.module_temp,
        hour=req.hour,
        minute=req.minute,
    )
    
    k = req.k if req.k is not None else model_service.default_k
    low_thr, high_thr = compute_threshold(plant_name, k)
    residual_kw = calculate_residual(req.actual_kw, expected_kw)
    pct_dev = calculate_pct_deviation(residual_kw, expected_kw, model_service.min_pred_kw)
    flagged = check_is_flagged(pct_dev, low_thr, high_thr)
    direction = determine_direction(residual_kw)
    flag_type = determine_flag_type(req.actual_kw, residual_kw, flagged)

    return AnomalyResponse(
        plant_name=plant_name,
        expected_kw=expected_kw,
        actual_kw=round(req.actual_kw, 2),
        residual_kw=residual_kw,
        pct_deviation=pct_dev,
        threshold_pct=[low_thr, high_thr],
        k=k,
        flagged=flagged,
        direction=direction,
        type=flag_type,
        disclaimer=DISCLAIMER_TEXT,
    )


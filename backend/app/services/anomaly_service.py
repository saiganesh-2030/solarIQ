from typing import Optional, Tuple
from ..config import DISCLAIMER_TEXT, MIN_PRED_KW
from .model_service import model_service

def compute_threshold(plant_name: str, k: float) -> Tuple[float, float]:
    center = model_service.center_pct.get(plant_name, 0.0)
    spread = model_service.spread_pct.get(plant_name, 1.0)
    lo = center - (k * spread)
    hi = center + (k * spread)
    return round(lo, 2), round(hi, 2)

def calculate_residual(actual_kw: float, expected_kw: float) -> float:
    return round(actual_kw - expected_kw, 2)

def calculate_pct_deviation(
    residual_kw: float,
    expected_kw: float,
    min_pred_kw: float = MIN_PRED_KW
) -> Optional[float]:
    if expected_kw < min_pred_kw:
        return None
    return round((residual_kw / expected_kw) * 100.0, 2)

def check_is_flagged(pct_dev: Optional[float], low_thr: float, high_thr: float) -> bool:
    if pct_dev is None:
        return False
    return bool(pct_dev < low_thr or pct_dev > high_thr)

def determine_direction(residual_kw: float) -> str:
    if residual_kw < 0:
        return "Below expected"
    elif residual_kw > 0:
        return "Above expected"
    return "Matching expected"

def determine_flag_type(actual_kw: float, residual_kw: float, is_flagged: bool) -> str:
    if not is_flagged:
        return ""
    if actual_kw == 0.0:
        return "Zero reading (possible data gap)"
    if residual_kw < 0.0:
        return "Below expected"
    return "Above expected"


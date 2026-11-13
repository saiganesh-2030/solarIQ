import json
from fastapi import APIRouter, HTTPException
from ..config import ARTIFACT_DIR, WEATHER_NOTE

router = APIRouter(tags=["Weather"])

_weather_cache = None

@router.get("/weather-analysis")
def get_weather_analysis():
    global _weather_cache
    if _weather_cache is None:
        weather_path = ARTIFACT_DIR / "weather_analysis.json"
        if not weather_path.exists():
            raise HTTPException(status_code=500, detail="weather_analysis.json not found in artifacts.")
        with open(weather_path, "r", encoding="utf-8") as f:
            _weather_cache = json.load(f)
            if "note" not in _weather_cache:
                _weather_cache["note"] = WEATHER_NOTE
        fi_path = ARTIFACT_DIR / "feature_importance.json"
        if fi_path.exists():
            with open(fi_path, "r", encoding="utf-8") as f:
                _weather_cache["feature_importance"] = json.load(f)
        else:
            _weather_cache["feature_importance"] = {}
    return _weather_cache


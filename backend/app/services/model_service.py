import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from fastapi import HTTPException
from ..config import ARTIFACT_DIR, PLANT_NAMES, MIN_PRED_KW, DEFAULT_K

class ModelService:
    def __init__(self):
        self.bundle: Dict[str, Any] = {}
        self.models: Dict[str, Any] = {}
        self.features: Dict[str, List[str]] = {}
        self.center_pct: Dict[str, float] = {}
        self.spread_pct: Dict[str, float] = {}
        self.thr_pct: Dict[str, List[float]] = {}
        self.min_pred_kw: float = MIN_PRED_KW
        self.default_k: float = DEFAULT_K
        self.plant_flag: Dict[int, str] = PLANT_NAMES
        self.loaded: bool = False

    def load_bundle(self):
        if self.loaded:
            return
        model_path = ARTIFACT_DIR / "solar_rf_models.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Model bundle not found at {model_path}")
        
        self.bundle = joblib.load(model_path)
        self.models = self.bundle.get("models", {})
        self.features = self.bundle.get("features", {})
        self.center_pct = self.bundle.get("center_pct", {})
        self.spread_pct = self.bundle.get("spread_pct", {})
        self.thr_pct = self.bundle.get("thr_pct", {})
        self.min_pred_kw = float(self.bundle.get("min_pred_kw", MIN_PRED_KW))
        self.default_k = float(self.bundle.get("k", DEFAULT_K))
        self.plant_flag = self.bundle.get("plant_flag", PLANT_NAMES)
        self.loaded = True

    def get_plant_name(self, plant_id: int) -> str:
        # Check both int and str keys if any
        if plant_id in self.plant_flag:
            return self.plant_flag[plant_id]
        if str(plant_id) in self.plant_flag:
            return self.plant_flag[str(plant_id)]
        raise HTTPException(
            status_code=400,
            detail=f"Unknown plant_id '{plant_id}'. Allowed plants: {list(self.plant_flag.keys())}"
        )

    def predict(
        self,
        plant_id: int,
        irradiation: float,
        ambient_temp: float,
        module_temp: float,
        hour: int,
        minute: int
    ) -> float:
        if not self.loaded:
            raise RuntimeError("ModelService is not loaded yet.")

        plant_name = self.get_plant_name(plant_id)
        if plant_name not in self.models:
            raise HTTPException(status_code=500, detail=f"Model for '{plant_name}' is unavailable.")

        model = self.models[plant_name]
        feat_cols = self.features[plant_name]

        row = {
            "IRRADIATION": irradiation,
            "AMBIENT_TEMPERATURE": ambient_temp,
            "MODULE_TEMPERATURE": module_temp,
        }

        if "TOD_SIN" in feat_cols or "TOD_COS" in feat_cols:
            t = hour + (minute / 60.0)
            row["TOD_SIN"] = np.sin(2 * np.pi * t / 24.0)
            row["TOD_COS"] = np.cos(2 * np.pi * t / 24.0)

        input_df = pd.DataFrame([row])[feat_cols]
        raw_pred = model.predict(input_df)[0]
        clipped_pred = max(0.0, float(raw_pred))
        return round(clipped_pred, 2)

    def predict_dataframe(self, df: pd.DataFrame, plant_name: str) -> np.ndarray:
        if not self.loaded:
            raise RuntimeError("ModelService is not loaded yet.")

        if plant_name not in self.models:
            raise ValueError(f"Unknown model plant_name '{plant_name}'")

        model = self.models[plant_name]
        feat_cols = self.features[plant_name]

        data = df.copy()
        if "TOD_SIN" in feat_cols or "TOD_COS" in feat_cols:
            if "DATE_TIME" in data.columns and not np.issubdtype(data["DATE_TIME"].dtype, np.datetime64):
                dt = pd.to_datetime(data["DATE_TIME"])
                t = dt.dt.hour + dt.dt.minute / 60.0
            elif "HOUR" in data.columns and "MINUTE" in data.columns:
                t = data["HOUR"] + data["MINUTE"] / 60.0
            else:
                raise ValueError("DataFrame requires DATE_TIME or HOUR/MINUTE for time features.")
            data["TOD_SIN"] = np.sin(2 * np.pi * t / 24.0)
            data["TOD_COS"] = np.cos(2 * np.pi * t / 24.0)

        input_matrix = data[feat_cols]
        preds = model.predict(input_matrix)
        return np.clip(preds, 0.0, None)

# Global singleton instance
model_service = ModelService()

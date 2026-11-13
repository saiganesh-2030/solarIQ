from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

# --- Health & Meta Schemas ---

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    models: List[str]

class MetaResponse(BaseModel):
    plants: Dict[int, str]
    features: Dict[str, List[str]]
    split: Dict[str, List[str]]
    thresholds: Dict[str, List[float]]
    defaults: Dict[str, Any]
    limits_note: str

# --- Prediction Schemas ---

class PredictRequest(BaseModel):
    plant_id: int = Field(..., description="Plant ID: 4135001 (Plant 1) or 4136001 (Plant 2)")
    irradiation: float = Field(..., ge=0.0, le=1.5, description="Solar irradiation in kW/m²")
    ambient_temp: float = Field(..., ge=-20.0, le=60.0, description="Ambient temperature in °C")
    module_temp: float = Field(..., ge=-20.0, le=90.0, description="Module temperature in °C")
    hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    minute: int = Field(0, description="Minute of the reading (0, 15, 30, 45)")

    @field_validator("minute")
    @classmethod
    def validate_minute(cls, v: int) -> int:
        if v not in (0, 15, 30, 45):
            raise ValueError("Minute must be one of: 0, 15, 30, 45")
        return v

class PredictResponse(BaseModel):
    plant_id: int
    plant_name: str
    expected_kw: float
    model: str

# --- Typical Day Schemas ---

class TypicalDayPoint(BaseModel):
    time: str
    expected_kw: float
    irradiation: float
    ambient_temp: float
    module_temp: float

# --- Anomaly Schemas ---

class AnomalyRequest(BaseModel):
    plant_id: int = Field(..., description="Plant ID")
    irradiation: float = Field(..., ge=0.0, le=1.5)
    ambient_temp: float = Field(..., ge=-20.0, le=60.0)
    module_temp: float = Field(..., ge=-20.0, le=90.0)
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(0)
    actual_kw: float = Field(..., ge=0.0, description="Observed actual AC power in kW")
    k: Optional[float] = Field(None, ge=0.5, le=10.0, description="Multiplier for anomaly threshold width")

    @field_validator("minute")
    @classmethod
    def validate_minute(cls, v: int) -> int:
        if v not in (0, 15, 30, 45):
            raise ValueError("Minute must be one of: 0, 15, 30, 45")
        return v

class AnomalyResponse(BaseModel):
    plant_name: str
    expected_kw: float
    actual_kw: float
    residual_kw: float
    pct_deviation: Optional[float]
    threshold_pct: List[float]
    k: float
    flagged: bool
    direction: str
    type: str
    disclaimer: str

# --- Financial Convert Schemas ---

class FinancialConvertRequest(BaseModel):
    expected_kw: float = Field(..., ge=0.0)
    actual_kw: float = Field(..., ge=0.0)
    tariff: float = Field(6.0, ge=0.0, le=1000.0)
    interval_hours: float = Field(0.25, gt=0.0, le=24.0)

class FinancialConvertResponse(BaseModel):
    expected_kwh: float
    actual_kwh: float
    shortfall_kwh: float
    shortfall_money: float
    note: str


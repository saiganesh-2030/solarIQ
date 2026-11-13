import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.routers.predict import get_metadata, predict_power
from app.schemas import PredictRequest
from app.services.model_service import model_service

@pytest.fixture(scope="module", autouse=True)
def load_model():
    model_service.load_bundle()

def test_meta():
    res = get_metadata()
    assert "Plant 1" in res.features
    assert "Plant 2" in res.features
    assert res.defaults["k"] == 3.5

def test_predict_daytime():
    req = PredictRequest(
        plant_id=4135001,
        irradiation=0.8,
        ambient_temp=30.0,
        module_temp=50.0,
        hour=12,
        minute=0
    )
    res = predict_power(req)
    assert res.plant_id == 4135001
    assert res.plant_name == "Plant 1"
    assert res.expected_kw > 0
    assert res.expected_kw >= 0

def test_predict_night():
    req = PredictRequest(
        plant_id=4135001,
        irradiation=0.0,
        ambient_temp=20.0,
        module_temp=18.0,
        hour=2,
        minute=0
    )
    res = predict_power(req)
    assert res.expected_kw == 0.0

def test_predict_invalid_inputs():
    # Invalid plant_id
    with pytest.raises(HTTPException) as exc_info:
        req = PredictRequest(
            plant_id=9999999,
            irradiation=0.5,
            ambient_temp=25.0,
            module_temp=35.0,
            hour=12,
            minute=0
        )
        predict_power(req)
    assert exc_info.value.status_code == 400

    # Invalid hour
    with pytest.raises(ValidationError):
        PredictRequest(
            plant_id=4135001,
            irradiation=0.5,
            ambient_temp=25.0,
            module_temp=35.0,
            hour=25,
            minute=0
        )

    # Invalid minute
    with pytest.raises(ValidationError):
        PredictRequest(
            plant_id=4135001,
            irradiation=0.5,
            ambient_temp=25.0,
            module_temp=35.0,
            hour=12,
            minute=7
        )

    # Invalid irradiation
    with pytest.raises(ValidationError):
        PredictRequest(
            plant_id=4135001,
            irradiation=5.0,
            ambient_temp=25.0,
            module_temp=35.0,
            hour=12,
            minute=0
        )

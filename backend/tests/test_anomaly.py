import pytest
from app.routers.anomaly import analyze_anomaly
from app.schemas import AnomalyRequest
from app.services.model_service import model_service
from app.config import DISCLAIMER_TEXT

@pytest.fixture(scope="module", autouse=True)
def load_model():
    model_service.load_bundle()

def test_anomaly_flagged_below_expected():
    req = AnomalyRequest(
        plant_id=4136001,
        irradiation=0.49,
        ambient_temp=31.2,
        module_temp=39.9,
        hour=13,
        minute=0,
        actual_kw=3078.35,
        k=3.5
    )
    res = analyze_anomaly(req)
    assert res.plant_name == "Plant 2"
    assert res.flagged is True
    assert res.type == "Below expected"
    assert res.residual_kw < 0
    assert res.pct_deviation is not None
    assert res.disclaimer == DISCLAIMER_TEXT

def test_anomaly_normal_reading():
    # Normal daytime output for Plant 1
    req = AnomalyRequest(
        plant_id=4135001,
        irradiation=0.8,
        ambient_temp=30.0,
        module_temp=50.0,
        hour=12,
        minute=0,
        actual_kw=22849.0,
        k=3.5
    )
    res = analyze_anomaly(req)
    assert res.plant_name == "Plant 1"
    assert res.flagged is False
    assert res.type == ""

def test_anomaly_below_min_pred_kw():
    # Very low irradiation giving expected < 500 kW
    req = AnomalyRequest(
        plant_id=4135001,
        irradiation=0.005,
        ambient_temp=22.0,
        module_temp=20.0,
        hour=6,
        minute=0,
        actual_kw=50.0,
        k=3.5
    )
    res = analyze_anomaly(req)
    if res.expected_kw < 500.0:
        assert res.pct_deviation is None
        assert res.flagged is False


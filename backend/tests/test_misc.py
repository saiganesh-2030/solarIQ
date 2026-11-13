import pytest
from app.routers.predict import get_typical_day
from app.routers.weather import get_weather_analysis
from app.routers.performance import get_model_performance
from app.services.model_service import model_service
from app.config import LIMITS_NOTE, WEATHER_NOTE

@pytest.fixture(scope="module", autouse=True)
def load_model():
    model_service.load_bundle()

def test_typical_day():
    points = get_typical_day(plant_id=4135001)
    assert len(points) == 96
    assert points[0]["time"] == "00:00"
    assert points[-1]["time"] == "23:45"
    assert points[48]["expected_kw"] >= 0  # 12:00 midday slot

def test_weather_analysis():
    data = get_weather_analysis()
    assert "correlation_by_plant" in data
    assert "scatter_sample" in data
    assert "hourly_avg" in data
    assert data["note"] == WEATHER_NOTE

def test_model_performance():
    data = get_model_performance()
    assert "split" in data
    assert "test_random_forest" in data
    assert "feature_importance" in data
    assert data["limits_note"] == LIMITS_NOTE


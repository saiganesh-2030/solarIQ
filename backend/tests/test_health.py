import pytest
from app.routers.health import get_health
from app.services.model_service import model_service

@pytest.fixture(scope="module", autouse=True)
def load_model():
    model_service.load_bundle()

def test_health():
    res = get_health()
    assert res.status == "ok"
    assert res.model_loaded is True
    assert "Plant 1" in res.models
    assert "Plant 2" in res.models

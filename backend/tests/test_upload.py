import pytest
from fastapi import HTTPException
from app.routers.analysis import demo_analysis, get_or_recompute_analysis, download_analysis_csv
from app.services.model_service import model_service
from app.services.csv_service import validate_and_prepare_csv

@pytest.fixture(scope="module", autouse=True)
def load_model():
    model_service.load_bundle()

def test_demo_analysis_k35():
    res = demo_analysis(tariff=6.0, k=3.5)
    assert res["summary"]["flagged_count"] in (20, 23)
    assert res["rows_used"] == 1150
    assert len(res["anomalies"]) in (20, 23)
    assert len(res["series"]) <= 3000

    analysis_id = res["analysis_id"]

    # Recompute with lower k -> more or equal anomalies
    res_k2 = get_or_recompute_analysis(analysis_id=analysis_id, tariff=6.0, k=2.0)
    assert res_k2["summary"]["flagged_count"] > res["summary"]["flagged_count"]

    # Recompute with higher k -> fewer or equal anomalies
    res_k5 = get_or_recompute_analysis(analysis_id=analysis_id, tariff=6.0, k=5.0)
    assert res_k5["summary"]["flagged_count"] <= res["summary"]["flagged_count"]

    # Download CSV
    csv_resp = download_analysis_csv(analysis_id=analysis_id)
    assert csv_resp.status_code == 200
    assert "DATE_TIME,PLANT,ACTUAL_KW" in csv_resp.body.decode("utf-8")

def test_upload_missing_column():
    bad_csv = b"DATE_TIME,PLANT_ID,AC_POWER,AMBIENT_TEMPERATURE\n2020-05-15 00:00:00,4135001,0.0,25.0"
    with pytest.raises(HTTPException) as exc_info:
        validate_and_prepare_csv(bad_csv)
    assert exc_info.value.status_code == 400
    assert "Missing required columns" in exc_info.value.detail

def test_upload_unknown_plant_id():
    bad_csv = (
        b"DATE_TIME,PLANT_ID,AC_POWER,AMBIENT_TEMPERATURE,MODULE_TEMPERATURE,IRRADIATION\n"
        b"2020-05-15 00:00:00,9999999,0.0,25.0,25.0,0.0"
    )
    with pytest.raises(HTTPException) as exc_info:
        validate_and_prepare_csv(bad_csv)
    assert exc_info.value.status_code == 400
    assert "Unknown PLANT_ID" in exc_info.value.detail

def test_upload_drops_missing_weather():
    csv_with_na = (
        b"DATE_TIME,PLANT_ID,AC_POWER,AMBIENT_TEMPERATURE,MODULE_TEMPERATURE,IRRADIATION\n"
        b"2020-05-15 00:00:00,4135001,0.0,25.0,25.0,0.0\n"
        b"2020-05-15 00:15:00,4135001,0.0,,25.0,0.0\n"
    )
    df, rows_rec, rows_used, rows_dropped = validate_and_prepare_csv(csv_with_na)
    assert rows_rec == 2
    assert rows_used == 1
    assert rows_dropped == 1


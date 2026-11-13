import uuid
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Response
from fastapi.responses import FileResponse

from ..config import ARTIFACT_DIR, DEFAULT_TARIFF, DEFAULT_K
from ..services.csv_service import (
    validate_and_prepare_csv,
    run_predictions_on_df,
    evaluate_anomalies_and_financials,
)
from ..services.analysis_store import analysis_store

router = APIRouter(tags=["Analysis"])

@router.post("/upload")
def upload_csv(
    file: UploadFile = File(...),
    tariff: float = Query(DEFAULT_TARIFF, ge=0.0, le=1000.0),
    k: float = Query(DEFAULT_K, ge=0.5, le=10.0),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    file_bytes = file.file.read()
    df, rows_received, rows_used, rows_dropped_missing = validate_and_prepare_csv(file_bytes)
    pred_df = run_predictions_on_df(df)

    analysis_id = uuid.uuid4().hex[:8]
    result = evaluate_anomalies_and_financials(
        df=pred_df,
        k=k,
        tariff=tariff,
        analysis_id=analysis_id,
        rows_received=rows_received,
        rows_dropped_missing=rows_dropped_missing,
    )

    # Cache in store
    analysis_store.put(analysis_id, {
        "df": pred_df,
        "rows_received": rows_received,
        "rows_dropped_missing": rows_dropped_missing,
        "result": result,
    })

    return result

@router.get("/demo-analysis")
def demo_analysis(
    tariff: float = Query(DEFAULT_TARIFF, ge=0.0, le=1000.0),
    k: float = Query(DEFAULT_K, ge=0.5, le=10.0),
):
    demo_file = ARTIFACT_DIR / "demo_upload.csv"
    if not demo_file.exists():
        raise HTTPException(status_code=500, detail="Demo file demo_upload.csv not found in artifacts.")

    with open(demo_file, "rb") as f:
        file_bytes = f.read()

    df, rows_received, rows_used, rows_dropped_missing = validate_and_prepare_csv(file_bytes)
    pred_df = run_predictions_on_df(df)

    analysis_id = "demo-" + uuid.uuid4().hex[:6]
    result = evaluate_anomalies_and_financials(
        df=pred_df,
        k=k,
        tariff=tariff,
        analysis_id=analysis_id,
        rows_received=rows_received,
        rows_dropped_missing=rows_dropped_missing,
    )

    analysis_store.put(analysis_id, {
        "df": pred_df,
        "rows_received": rows_received,
        "rows_dropped_missing": rows_dropped_missing,
        "result": result,
    })

    return result

@router.get("/analysis/{analysis_id}")
def get_or_recompute_analysis(
    analysis_id: str,
    tariff: float = Query(DEFAULT_TARIFF, ge=0.0, le=1000.0),
    k: float = Query(DEFAULT_K, ge=0.5, le=10.0),
):
    entry = analysis_store.get(analysis_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"Analysis with id '{analysis_id}' was not found or has expired."
        )

    stored_df = entry["df"]
    rows_rec = entry["rows_received"]
    rows_drop = entry["rows_dropped_missing"]

    result = evaluate_anomalies_and_financials(
        df=stored_df,
        k=k,
        tariff=tariff,
        analysis_id=analysis_id,
        rows_received=rows_rec,
        rows_dropped_missing=rows_drop,
    )

    entry["result"] = result
    return result

@router.get("/analysis/{analysis_id}/download")
def download_analysis_csv(analysis_id: str):
    entry = analysis_store.get(analysis_id)
    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"Analysis with id '{analysis_id}' was not found."
        )

    df = entry["df"].copy()
    result = entry["result"]
    thr_pct = result["thresholds_pct"]

    export_df = pd.DataFrame({
        "DATE_TIME": df["DATE_TIME"].astype(str),
        "PLANT": df["PLANT"],
        "ACTUAL_KW": df["AC_POWER"],
        "EXPECTED_KW": df["PREDICTED"],
        "RESIDUAL_KW": df["RESIDUAL"],
        "PCT_DEVIATION": df["PCT_DEV"],
        "THRESHOLD_PCT_LOW": df["PLANT"].map(lambda p: thr_pct[p][0]),
        "THRESHOLD_PCT_HIGH": df["PLANT"].map(lambda p: thr_pct[p][1]),
        "FLAGGED": df["IS_ANOMALY"],
        "TYPE": df["TYPE"],
    })

    csv_data = export_df.to_csv(index=False)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="analysis_{analysis_id}.csv"'}
    )

@router.get("/sample-csv")
def download_sample_csv():
    demo_file = ARTIFACT_DIR / "demo_upload.csv"
    if not demo_file.exists():
        raise HTTPException(status_code=404, detail="Sample template CSV not found.")
    return FileResponse(
        path=str(demo_file),
        media_type="text/csv",
        filename="solar_sample_template.csv"
    )


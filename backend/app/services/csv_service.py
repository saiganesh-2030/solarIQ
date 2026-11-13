import io
import uuid
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from fastapi import HTTPException, UploadFile

from ..config import INTERVAL_HOURS, DEFAULT_TARIFF, DEFAULT_K, DISCLAIMER_TEXT
from .model_service import model_service
from .anomaly_service import compute_threshold

REQUIRED_COLUMNS = [
    "DATE_TIME",
    "PLANT_ID",
    "AC_POWER",
    "AMBIENT_TEMPERATURE",
    "MODULE_TEMPERATURE",
    "IRRADIATION",
]

def validate_and_prepare_csv(file_bytes: bytes, max_mb: int = 5) -> Tuple[pd.DataFrame, int, int, int]:
    if len(file_bytes) > max_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {max_mb} MB."
        )

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    rows_received = len(df)
    if rows_received == 0:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    # Check required columns
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV: {', '.join(missing)}"
        )

    # Validate plant IDs
    valid_ids = list(model_service.plant_flag.keys())
    unique_ids = df["PLANT_ID"].unique().tolist()
    invalid_ids = [pid for pid in unique_ids if pid not in valid_ids and str(pid) not in [str(k) for k in valid_ids]]
    if invalid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown PLANT_ID: {invalid_ids}. Allowed values are {valid_ids}."
        )

    # Parse DATE_TIME
    try:
        df["DATE_TIME"] = pd.to_datetime(df["DATE_TIME"])
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse DATE_TIME column: {str(e)}"
        )

    # Validate and cast numeric columns
    num_cols = ["AC_POWER", "AMBIENT_TEMPERATURE", "MODULE_TEMPERATURE", "IRRADIATION"]
    for col in num_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop missing weather readings
    weather_cols = ["AMBIENT_TEMPERATURE", "MODULE_TEMPERATURE", "IRRADIATION"]
    has_missing_weather = df[weather_cols].isna().any(axis=1)
    rows_dropped_missing = int(has_missing_weather.sum())
    df = df[~has_missing_weather].copy()

    # Drop duplicate (DATE_TIME, PLANT_ID)
    dup_mask = df.duplicated(subset=["DATE_TIME", "PLANT_ID"])
    rows_dropped_duplicates = int(dup_mask.sum())
    df = df[~dup_mask].sort_values(["DATE_TIME", "PLANT_ID"]).reset_index(drop=True)

    rows_used = len(df)
    if rows_used == 0:
        raise HTTPException(status_code=400, detail="No valid rows remain after cleaning.")

    # Create helper columns
    df["PLANT"] = df["PLANT_ID"].map(lambda x: model_service.get_plant_name(x))
    df["HOUR"] = df["DATE_TIME"].dt.hour
    df["MINUTE"] = df["DATE_TIME"].dt.minute
    df["DATE"] = df["DATE_TIME"].dt.date.astype(str)

    return df, rows_received, rows_used, rows_dropped_missing

def run_predictions_on_df(df: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for plant_name, group in df.groupby("PLANT"):
        g = group.copy()
        preds = model_service.predict_dataframe(g, plant_name)
        g["PREDICTED"] = np.round(preds, 2)
        parts.append(g)
    
    res = pd.concat(parts).sort_values(["DATE_TIME", "PLANT"]).reset_index(drop=True)
    res["RESIDUAL"] = np.round(res["AC_POWER"] - res["PREDICTED"], 2)
    return res

def evaluate_anomalies_and_financials(
    df: pd.DataFrame,
    k: float,
    tariff: float,
    analysis_id: str,
    rows_received: int,
    rows_dropped_missing: int
) -> Dict[str, Any]:
    min_pred = model_service.min_pred_kw
    hours = INTERVAL_HOURS

    # Thresholds per plant
    thr_pct = {}
    for p in df["PLANT"].unique():
        thr_pct[p] = compute_threshold(p, k)

    # % deviation and flags
    df["PCT_DEV"] = np.where(
        df["PREDICTED"] >= min_pred,
        np.round(100.0 * df["RESIDUAL"] / df["PREDICTED"], 2),
        np.nan
    )

    is_anom = []
    types = []
    for _, row in df.iterrows():
        p = row["PLANT"]
        pdev = row["PCT_DEV"]
        lo, hi = thr_pct[p]
        if pd.isna(pdev):
            anom = False
            t = ""
        else:
            anom = (pdev < lo) or (pdev > hi)
            if not anom:
                t = ""
            elif row["AC_POWER"] == 0.0:
                t = "Zero reading (possible data gap)"
            elif row["RESIDUAL"] < 0.0:
                t = "Below expected"
            else:
                t = "Above expected"
        is_anom.append(anom)
        types.append(t)

    df["IS_ANOMALY"] = is_anom
    df["TYPE"] = types

    # Energy calculations (kWh)
    df["EXPECTED_KWH"] = np.round(df["PREDICTED"] * hours, 2)
    df["ACTUAL_KWH"] = np.round(df["AC_POWER"] * hours, 2)
    df["NET_KWH"] = np.round(df["RESIDUAL"] * hours, 2)
    df["SHORTFALL_KWH"] = np.where(df["RESIDUAL"] < 0, np.round(-df["RESIDUAL"] * hours, 2), 0.0)
    df["FLAGGED_SHORTFALL_KWH"] = np.where(df["IS_ANOMALY"], df["SHORTFALL_KWH"], 0.0)

    # Summary by plant
    by_plant = []
    for plant_name, g in df.groupby("PLANT"):
        flagged_count = int(g["IS_ANOMALY"].sum())
        exp_kwh = round(float(g["EXPECTED_KWH"].sum()), 1)
        act_kwh = round(float(g["ACTUAL_KWH"].sum()), 1)
        net_k = round(float(g["NET_KWH"].sum()), 1)
        short_k = round(float(g["SHORTFALL_KWH"].sum()), 1)
        flag_short_k = round(float(g["FLAGGED_SHORTFALL_KWH"].sum()), 1)

        by_plant.append({
            "plant": plant_name,
            "flagged": flagged_count,
            "expected_kwh": exp_kwh,
            "actual_kwh": act_kwh,
            "net_kwh": net_k,
            "net_money": round(net_k * tariff, 1),
            "shortfall_kwh": short_k,
            "shortfall_money": round(short_k * tariff, 1),
            "flagged_shortfall_kwh": flag_short_k,
            "flagged_shortfall_money": round(flag_short_k * tariff, 1),
        })

    total_rows = len(df)
    total_flagged = int(df["IS_ANOMALY"].sum())
    total_flagged_pct = round(100.0 * total_flagged / total_rows, 1) if total_rows > 0 else 0.0
    total_net_kwh = round(float(df["NET_KWH"].sum()), 1)
    total_net_money = round(total_net_kwh * tariff, 1)

    # Series (limit to at most 3000 points)
    sample_df = df if len(df) <= 3000 else df.iloc[::int(np.ceil(len(df) / 3000))]
    series = [
        {
            "t": str(r["DATE_TIME"]),
            "plant": r["PLANT"],
            "actual_kw": float(r["AC_POWER"]),
            "expected_kw": float(r["PREDICTED"]),
            "residual_kw": float(r["RESIDUAL"]),
            "flagged": bool(r["IS_ANOMALY"]),
        }
        for _, r in sample_df.iterrows()
    ]

    # Anomalies list
    anom_rows = df[df["IS_ANOMALY"]]
    anomalies = [
        {
            "t": str(r["DATE_TIME"]),
            "plant": r["PLANT"],
            "actual_kw": float(r["AC_POWER"]),
            "expected_kw": float(r["PREDICTED"]),
            "residual_kw": float(r["RESIDUAL"]),
            "pct_deviation": None if pd.isna(r["PCT_DEV"]) else float(r["PCT_DEV"]),
            "irradiation": float(r["IRRADIATION"]),
            "module_temp": float(r["MODULE_TEMPERATURE"]),
            "ambient_temp": float(r["AMBIENT_TEMPERATURE"]),
            "threshold_pct": list(thr_pct[r["PLANT"]]),
            "type": str(r["TYPE"]),
        }
        for _, r in anom_rows.iterrows()
    ]

    # Daily summary per plant
    daily_grouped = df.groupby(["DATE", "PLANT"]).agg(
        flagged=("IS_ANOMALY", "sum"),
        shortfall_kwh=("SHORTFALL_KWH", "sum"),
        flagged_shortfall_kwh=("FLAGGED_SHORTFALL_KWH", "sum")
    ).reset_index()

    daily = [
        {
            "date": str(r["DATE"]),
            "plant": r["PLANT"],
            "flagged": int(r["flagged"]),
            "shortfall_kwh": round(float(r["shortfall_kwh"]), 1),
            "shortfall_money": round(float(r["shortfall_kwh"]) * tariff, 1),
            "flagged_shortfall_kwh": round(float(r["flagged_shortfall_kwh"]), 1),
            "flagged_shortfall_money": round(float(r["flagged_shortfall_kwh"]) * tariff, 1),
        }
        for _, r in daily_grouped.iterrows()
    ]

    return {
        "analysis_id": analysis_id,
        "rows_received": rows_received,
        "rows_used": total_rows,
        "rows_dropped_missing": rows_dropped_missing,
        "date_range": [str(df["DATE_TIME"].min()), str(df["DATE_TIME"].max())],
        "k": k,
        "tariff": tariff,
        "thresholds_pct": thr_pct,
        "summary": {
            "flagged_count": total_flagged,
            "flagged_pct": total_flagged_pct,
            "net_kwh": total_net_kwh,
            "net_money": total_net_money,
            "by_plant": by_plant,
        },
        "series": series,
        "anomalies": anomalies,
        "daily": daily,
        "disclaimer": DISCLAIMER_TEXT,
    }


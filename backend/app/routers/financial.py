from fastapi import APIRouter
from ..schemas import FinancialConvertRequest, FinancialConvertResponse

router = APIRouter(tags=["Financial"])

@router.post("/financial/convert", response_model=FinancialConvertResponse)
def convert_financial(req: FinancialConvertRequest):
    exp_kwh = round(req.expected_kw * req.interval_hours, 2)
    act_kwh = round(req.actual_kw * req.interval_hours, 2)
    shortfall_kw = max(0.0, req.expected_kw - req.actual_kw)
    shortfall_kwh = round(shortfall_kw * req.interval_hours, 2)
    shortfall_money = round(shortfall_kwh * req.tariff, 2)

    return FinancialConvertResponse(
        expected_kwh=exp_kwh,
        actual_kwh=act_kwh,
        shortfall_kwh=shortfall_kwh,
        shortfall_money=shortfall_money,
        note="Estimate only; includes normal model error."
    )


import pytest
from app.routers.financial import convert_financial
from app.schemas import FinancialConvertRequest

def test_financial_conversion():
    req = FinancialConvertRequest(
        expected_kw=1000.0,
        actual_kw=800.0,
        tariff=6.0,
        interval_hours=0.25
    )
    res = convert_financial(req)
    assert res.expected_kwh == 250.0
    assert res.actual_kwh == 200.0
    assert res.shortfall_kwh == 50.0
    assert res.shortfall_money == 300.0
    assert "Estimate only" in res.note

def test_financial_surplus():
    # When actual exceeds expected, shortfall is 0.0
    req = FinancialConvertRequest(
        expected_kw=800.0,
        actual_kw=1000.0,
        tariff=6.0,
        interval_hours=0.25
    )
    res = convert_financial(req)
    assert res.shortfall_kwh == 0.0
    assert res.shortfall_money == 0.0


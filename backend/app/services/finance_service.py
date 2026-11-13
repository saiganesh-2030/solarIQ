from ..config import DEFAULT_TARIFF, INTERVAL_HOURS

def kw_to_kwh(kw: float, hours: float = INTERVAL_HOURS) -> float:
    return round(kw * hours, 2)

def calculate_shortfall_kwh(
    expected_kw: float,
    actual_kw: float,
    hours: float = INTERVAL_HOURS
) -> float:
    diff = max(0.0, expected_kw - actual_kw)
    return round(diff * hours, 2)

def kwh_to_money(kwh: float, tariff: float = DEFAULT_TARIFF) -> float:
    return round(kwh * tariff, 2)


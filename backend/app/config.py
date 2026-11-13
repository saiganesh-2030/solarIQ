from pathlib import Path

# Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

ARTIFACT_DIR = REPO_ROOT / "ml" / "artifacts"
DATA_DIR = REPO_ROOT / "data"
FRONTEND_DIR = REPO_ROOT / "frontend"

# Application Settings & Defaults
DEFAULT_TARIFF = 6.0
CURRENCY = "INR"
CURRENCY_SYMBOL = "₹"
INTERVAL_HOURS = 0.25
DEFAULT_K = 3.5
MIN_PRED_KW = 500.0

PLANT_NAMES = {
    4135001: "Plant 1",
    4136001: "Plant 2",
}

LIMITS_NOTE = (
    "Trained on about one month of data (15 May to 17 Jun 2020). "
    "Results should not be assumed to hold in other seasons."
)

DISCLAIMER_TEXT = "This is an investigation candidate, not a confirmed equipment fault."
WEATHER_NOTE = "These are associations, not proof of cause."


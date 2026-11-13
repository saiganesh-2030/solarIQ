from fastapi import APIRouter
from ..schemas import HealthResponse
from ..services.model_service import model_service

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    return HealthResponse(
        status="ok",
        model_loaded=model_service.loaded,
        models=list(model_service.models.keys())
    )

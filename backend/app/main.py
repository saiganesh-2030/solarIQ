import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR
from .services.model_service import model_service
from .routers import (
    health,
    predict,
    anomaly,
    analysis,
    weather,
    performance,
    financial,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ML models once
    model_service.load_bundle()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="SolarIQ API",
    version="1.0.0",
    description="Solar Power Generation Prediction and Performance Deviation Analysis API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Include API Routers
app.include_router(health.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(anomaly.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(financial.router, prefix="/api")

# Static files for frontend
index_path = FRONTEND_DIR / "index.html"
if index_path.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "message": "SolarIQ API is running. Frontend UI will be served here once built in Phase 6.",
            "docs": "/docs",
            "health": "/api/health",
            "meta": "/api/meta"
        }

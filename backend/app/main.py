import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .api.video_routes import router as video_router
from .api.webcam_routes import router as webcam_router
from .api.batch_routes import router as batch_router
from .core.config import settings
from .services.inference import inference_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model.  Shutdown: nothing special needed."""
    print(f"[MUREN AI] Starting up – loading model …")
    inference_service.load_model()
    yield
    print(f"[MUREN AI] Shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Human-Object Interaction Detection powered by the MUREN model.",
    lifespan=lifespan,
)

# CORS: Allow all origins in production/deployment or local configured origins
allowed_origins = list(settings.CORS_ORIGINS)
if "*" not in allowed_origins:
    allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(router)
app.include_router(video_router)
app.include_router(webcam_router)
app.include_router(batch_router)

# Mount React static files if built frontend exists (production mode)
frontend_dist = settings.PROJECT_ROOT / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")



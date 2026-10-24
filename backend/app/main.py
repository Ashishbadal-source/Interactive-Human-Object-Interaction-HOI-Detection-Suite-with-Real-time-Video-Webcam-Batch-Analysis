"""
MUREN AI – FastAPI application entry point.

Loads the MUREN model at startup and serves the inference API.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router)
app.include_router(video_router)
app.include_router(webcam_router)
app.include_router(batch_router)


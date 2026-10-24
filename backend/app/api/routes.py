"""
API routes for MUREN AI inference.
"""
import os
import traceback
from pathlib import Path

import json
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse, HTMLResponse, Response
from PIL import Image, UnidentifiedImageError

from ..core.config import settings
from ..schemas.responses import (
    ErrorResponse,
    HealthResponse,
    ModelInfoResponse,
    PredictResponse,
)
from ..services.inference import inference_service
from ..services.report_generator import report_generator

router = APIRouter(prefix="/api")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ---- Health ----------------------------------------------------------------

@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok" if inference_service.model_loaded else "degraded",
        model_loaded=inference_service.model_loaded,
        device="cpu",
    )


# ---- Model Info ------------------------------------------------------------

@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info():
    return ModelInfoResponse(
        model_loaded=inference_service.model_loaded,
        checkpoint_epoch=inference_service.checkpoint_epoch,
        load_error=inference_service.load_error,
    )


# ---- Predict ---------------------------------------------------------------

@router.post("/predict", response_model=PredictResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def predict(
    image: UploadFile = File(...),
    min_action_score: float = Form(default=settings.DEFAULT_MIN_ACTION_SCORE),
    min_object_score: float = Form(default=settings.DEFAULT_MIN_OBJECT_SCORE),
    max_interactions: int = Form(default=settings.DEFAULT_MAX_INTERACTIONS),
):
    # ---- validate model is ready -----------------------------------------
    if not inference_service.model_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded.  Check server logs.",
        )

    # ---- validate file extension -----------------------------------------
    filename = image.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'.  Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # ---- validate file size ----------------------------------------------
    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(contents) / 1024 / 1024:.1f} MB).  Max: {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # ---- validate thresholds ---------------------------------------------
    if not (0.0 <= min_action_score <= 1.0):
        raise HTTPException(status_code=400, detail="min_action_score must be between 0 and 1.")
    if not (0.0 <= min_object_score <= 1.0):
        raise HTTPException(status_code=400, detail="min_object_score must be between 0 and 1.")
    if max_interactions < 1 or max_interactions > 64:
        raise HTTPException(status_code=400, detail="max_interactions must be between 1 and 64.")

    # ---- open & validate image -------------------------------------------
    import io

    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except (UnidentifiedImageError, Exception):
        raise HTTPException(
            status_code=400,
            detail="Could not open file as an image.  The file may be corrupt or not a valid image.",
        )

    # ---- run inference ---------------------------------------------------
    try:
        result = inference_service.predict(
            image=pil_image,
            min_action_score=min_action_score,
            min_object_score=min_object_score,
            max_interactions=max_interactions,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Inference failed unexpectedly.  Check server logs.",
        )

    # Save result metadata for academic report generation
    try:
        settings.results_dir.mkdir(parents=True, exist_ok=True)
        meta_path = settings.results_dir / f"{result['result_id']}_meta.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
    except Exception as e:
        print(f"[MUREN] Failed to save result metadata: {e}")

    return PredictResponse(
        success=True,
        result_id=result["result_id"],
        filename=filename,
        original_width=result["original_width"],
        original_height=result["original_height"],
        inference_time_ms=result["inference_time_ms"],
        total_candidates=result["total_candidates_before_limit"],
        predictions=result["predictions"],
    )


# ---- Serve annotated image & reports ---------------------------------------

@router.get("/result/{result_id}/image")
async def get_annotated_image(result_id: str):
    _validate_result_id(result_id)
    path = settings.results_dir / f"{result_id}_annotated.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Annotated image not found or expired.")
    return FileResponse(str(path), media_type="image/jpeg", filename=f"muren_{result_id}.jpg")


@router.get("/result/{result_id}/original")
async def get_original_image(result_id: str):
    _validate_result_id(result_id)
    path = settings.results_dir / f"{result_id}_original.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original image not found or expired.")
    return FileResponse(str(path), media_type="image/jpeg")


@router.get("/result/{result_id}/xai/{query_id}")
async def get_attention_heatmap(result_id: str, query_id: int):
    _validate_result_id(result_id)
    path = settings.results_dir / f"{result_id}_xai_{query_id}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Attention heatmap not found or expired.")
    return FileResponse(str(path), media_type="image/jpeg", filename=f"muren_xai_{result_id}_q{query_id}.jpg")


@router.get("/result/{result_id}/report")
async def get_result_report(result_id: str, format: str = Query("html", description="'html' (printable/pdf) or 'markdown'")):
    _validate_result_id(result_id)
    meta_path = settings.results_dir / f"{result_id}_meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Result metadata not found or expired.")

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if format.lower() == "markdown" or format.lower() == "md":
        md = report_generator.generate_image_markdown_report(data)
        return Response(content=md, media_type="text/markdown", headers={
            "Content-Disposition": f"attachment; filename=muren_hoi_report_{result_id}.md"
        })

    html = report_generator.generate_image_html_report(data)
    return HTMLResponse(content=html)


# ---- Samples ---------------------------------------------------------------

SAMPLE_FILES = [f"test{i}.jpg" for i in range(1, 9)]

@router.get("/samples")
async def get_samples():
    """List available benchmark sample images with metadata."""
    samples = []
    for filename in SAMPLE_FILES:
        path = settings.PROJECT_ROOT / filename
        if path.exists():
            samples.append({
                "filename": filename,
                "label": f"Benchmark Sample {filename.replace('test', '').replace('.jpg', '')}",
                "url": f"/api/samples/{filename}",
                "size_bytes": path.stat().st_size,
            })
    return {"samples": samples}


@router.get("/samples/{filename}")
async def get_sample_image(filename: str):
    """Serve a sample image."""
    if filename not in SAMPLE_FILES:
        raise HTTPException(status_code=404, detail="Sample image not found.")
    path = settings.PROJECT_ROOT / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Sample image file missing.")
    return FileResponse(str(path), media_type="image/jpeg")


# ---- Helpers ---------------------------------------------------------------

def _validate_result_id(result_id: str) -> None:
    """Reject obviously invalid or path-traversal result IDs."""
    if not result_id.isalnum() or len(result_id) > 24:
        raise HTTPException(status_code=400, detail="Invalid result ID.")

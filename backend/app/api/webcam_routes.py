"""
Real-Time Webcam Analysis routes using WebSocket streaming and HTTP snapshot fallback.
Provides high-throughput HOI inference for live webcam streams.
"""
import io
import time
import base64
import traceback
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from PIL import Image

from ..services.inference import inference_service
from ..core.config import settings

router = APIRouter(prefix="/api/webcam", tags=["webcam"])


@router.websocket("/stream")
async def websocket_webcam_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live webcam streaming.
    Client sends base64-encoded JPEG frames and receives HOI predictions in real-time.
    """
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "frame")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "time": time.time()})
                continue

            if msg_type == "frame":
                img_data = data.get("image")
                if not img_data:
                    await websocket.send_json({"type": "error", "message": "Missing image payload"})
                    continue

                # Strip data URL prefix if present
                if "," in img_data:
                    img_data = img_data.split(",", 1)[1]

                try:
                    img_bytes = base64.b64decode(img_data)
                    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                except Exception as decode_err:
                    await websocket.send_json({"type": "error", "message": f"Invalid image encoding: {decode_err}"})
                    continue

                min_action_score = float(data.get("min_action_score", settings.DEFAULT_MIN_ACTION_SCORE))
                min_object_score = float(data.get("min_object_score", settings.DEFAULT_MIN_OBJECT_SCORE))
                max_interactions = int(data.get("max_interactions", 5))

                t0 = time.perf_counter()
                try:
                    result = inference_service.predict(
                        image=pil_img,
                        min_action_score=min_action_score,
                        min_object_score=min_object_score,
                        max_interactions=max_interactions,
                    )
                    elapsed_ms = (time.perf_counter() - t0) * 1000.0

                    await websocket.send_json({
                        "type": "prediction",
                        "inference_time_ms": round(elapsed_ms, 1),
                        "total_candidates": result.get("total_candidates_before_limit", 0),
                        "original_width": result.get("original_width", pil_img.width),
                        "original_height": result.get("original_height", pil_img.height),
                        "predictions": result.get("predictions", []),
                        "timestamp": time.time(),
                    })
                except Exception as infer_err:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Inference error: {str(infer_err)}"
                    })

    except WebSocketDisconnect:
        # Normal client disconnect
        pass
    except Exception as e:
        print(f"[WebcamWS] Disconnected with error: {e}")


@router.post("/snapshot")
async def webcam_snapshot_predict(
    image: UploadFile = File(...),
    min_action_score: float = Form(0.20),
    min_object_score: float = Form(0.50),
    max_interactions: int = Form(5),
):
    """
    HTTP fallback endpoint for single snapshot inference from webcam feed.
    """
    if not inference_service.model_loaded:
        raise HTTPException(status_code=503, detail="Model engine not loaded")

    contents = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        result = inference_service.predict(
            image=pil_img,
            min_action_score=min_action_score,
            min_object_score=min_object_score,
            max_interactions=max_interactions,
        )
        return {
            "success": True,
            "inference_time_ms": result["inference_time_ms"],
            "original_width": result["original_width"],
            "original_height": result["original_height"],
            "predictions": result["predictions"],
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

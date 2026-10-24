"""
API routes for the MUREN AI Video Analysis Module.
Provides completely isolated endpoints under /api/video/*.
Does not modify or interfere with existing photo analysis endpoints.
"""
from pathlib import Path
from typing import Optional, List
import os
import shutil

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse

from ..core.config import settings
from ..schemas.video import (
    VideoJobStatus,
    VideoJobResultsResponse,
    SampleVideoItem,
)
from ..services.video_jobs import video_job_manager
from ..services.video_annotation import video_annotation_service
from ..services.video_tracking import video_action_tracker

router = APIRouter(prefix="/api/video")

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_VIDEO_BYTES = settings.MAX_VIDEO_UPLOAD_SIZE_MB * 1024 * 1024


# ---- Sample Video Management ------------------------------------------------

def _ensure_sample_video() -> Path:
    """Ensure a sample benchmark video exists in the project root."""
    sample_path = settings.PROJECT_ROOT / "test_sample_video.mp4"
    if sample_path.exists() and sample_path.stat().st_size > 1000:
        return sample_path

    # Compile a quick sample video from test1.jpg - test8.jpg
    import cv2
    img_paths = [settings.PROJECT_ROOT / f"test{i}.jpg" for i in range(1, 9) if (settings.PROJECT_ROOT / f"test{i}.jpg").exists()]
    if not img_paths:
        return sample_path

    first_img = cv2.imread(str(img_paths[0]))
    if first_img is None:
        return sample_path

    target_h, target_w = 480, 640
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(sample_path), fourcc, 1.0, (target_w, target_h))

    try:
        for p in img_paths:
            img = cv2.imread(str(p))
            if img is not None:
                resized = cv2.resize(img, (target_w, target_h))
                # Write each scene for 2 seconds (2 frames at 1 fps)
                writer.write(resized)
                writer.write(resized)
    finally:
        writer.release()

    return sample_path


@router.get("/samples", response_model=List[SampleVideoItem])
async def get_video_samples():
    """List ready-to-test benchmark video samples."""
    sample_path = _ensure_sample_video()
    samples: List[SampleVideoItem] = []

    if sample_path.exists():
        samples.append(
            SampleVideoItem(
                filename=sample_path.name,
                title="HICO-DET Multi-Scene Benchmark (16s)",
                description="Composite action sequence containing people interacting with sports gear, bicycles, kites, and appliances.",
                url=f"/api/video/samples/{sample_path.name}",
                duration_seconds=16.0,
                size_bytes=sample_path.stat().st_size,
            )
        )
    return samples


@router.get("/samples/{filename}")
async def serve_sample_video(filename: str):
    """Serve a sample video file for streaming/playback."""
    if filename != "test_sample_video.mp4":
        raise HTTPException(status_code=404, detail="Sample video not found.")
    path = settings.PROJECT_ROOT / filename
    if not path.exists():
        _ensure_sample_video()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Sample video missing.")
    return FileResponse(str(path), media_type="video/mp4")


# ---- Video Job Creation -----------------------------------------------------

@router.post("/jobs", response_model=VideoJobStatus)
async def create_video_job(
    video: Optional[UploadFile] = File(None),
    sample_filename: Optional[str] = Form(None),
    sampling_mode: str = Form("interval"),
    sampling_interval: float = Form(1.0),
    max_frames: int = Form(60),
    manual_timestamps: Optional[str] = Form(None),
    min_action_score: float = Form(0.20),
    min_object_score: float = Form(0.50),
    max_interactions: int = Form(5),
):
    """
    Upload and submit a video for Human-Object Interaction analysis.
    Supports local file upload or instant benchmark sample selection.
    """
    settings.video_upload_dir.mkdir(parents=True, exist_ok=True)
    settings.video_results_dir.mkdir(parents=True, exist_ok=True)

    # 1. Determine video source
    if sample_filename:
        src_path = settings.PROJECT_ROOT / sample_filename
        if not src_path.exists():
            _ensure_sample_video()
        if not src_path.exists():
            raise HTTPException(status_code=404, detail=f"Sample video '{sample_filename}' not found.")
        
        # Copy to a temporary working file
        import uuid
        temp_name = f"sample_{uuid.uuid4().hex[:8]}_{sample_filename}"
        dest_path = settings.video_upload_dir / temp_name
        shutil.copy2(src_path, dest_path)
        original_filename = sample_filename

    elif video is not None:
        filename = video.filename or "uploaded_video.mp4"
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video format '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}",
            )

        contents = await video.read()
        if len(contents) > MAX_VIDEO_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Video too large ({len(contents) / 1024 / 1024:.1f} MB). Max allowed is {settings.MAX_VIDEO_UPLOAD_SIZE_MB} MB.",
            )

        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

        import uuid
        safe_name = f"up_{uuid.uuid4().hex[:8]}_{Path(filename).name}"
        dest_path = settings.video_upload_dir / safe_name
        with open(dest_path, "wb") as f:
            f.write(contents)
        original_filename = filename
    else:
        raise HTTPException(status_code=400, detail="Must provide either a video file or sample_filename.")

    # 2. Parse manual timestamps if supplied
    parsed_timestamps: Optional[List[float]] = None
    if manual_timestamps and manual_timestamps.strip():
        try:
            parsed_timestamps = [float(x.strip()) for x in manual_timestamps.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid manual_timestamps format. Use comma-separated numbers.")

    # 3. Create and launch background job
    job = video_job_manager.create_job(
        filename=original_filename,
        video_path=dest_path,
        sampling_mode=sampling_mode,
        sampling_interval=max(0.1, sampling_interval),
        max_frames=max(1, min(120, max_frames)),
        manual_timestamps=parsed_timestamps,
        min_action_score=min_action_score,
        min_object_score=min_object_score,
        max_interactions=max_interactions,
    )

    status = video_job_manager.get_status(job.job_id)
    if not status:
        raise HTTPException(status_code=500, detail="Failed to initialize job.")
    return status


# ---- Video Job Status & Results ---------------------------------------------

@router.get("/jobs/{job_id}", response_model=VideoJobStatus)
async def get_job_status(job_id: str):
    """Poll the real-time processing status of a video job."""
    status = video_job_manager.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Video job not found or expired.")
    return status


@router.get("/jobs/{job_id}/results", response_model=VideoJobResultsResponse)
async def get_job_results(job_id: str):
    """Retrieve all frame-by-frame analysis results for a completed job."""
    job = video_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found.")

    total_interactions = sum(r.accepted_interactions_count for r in job.results)
    action_intervals = video_action_tracker.track_action_intervals(job.results)

    return VideoJobResultsResponse(
        job_id=job.job_id,
        status=job.status,
        video_metadata=job.video_metadata,
        total_analyzed_frames=len(job.results),
        total_detected_interactions=total_interactions,
        frames=job.results,
        action_intervals=action_intervals,
    )


@router.get("/jobs/{job_id}/frames/{frame_id}/{img_type}")
async def get_frame_image(job_id: str, frame_id: str, img_type: str):
    """
    Serve a specific frame image.
    img_type: 'thumb', 'annotated', or 'original'.
    """
    job = video_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if not frame_id.isalnum() and "_" not in frame_id:
        raise HTTPException(status_code=400, detail="Invalid frame ID.")

    if img_type not in {"thumb", "annotated", "original"}:
        raise HTTPException(status_code=400, detail="Invalid image type.")

    file_path = job.frames_dir / f"{frame_id}_{img_type}.jpg"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Frame image not found.")

    return FileResponse(str(file_path), media_type="image/jpeg")


@router.get("/jobs/{job_id}/video-stream")
async def get_video_stream(job_id: str):
    """Serve the original uploaded video for HTML5 player preview."""
    job = video_job_manager.get_job(job_id)
    if not job or not job.video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found.")

    return FileResponse(str(job.video_path), media_type="video/mp4")


# ---- Video Compilation & Export ---------------------------------------------

@router.post("/jobs/{job_id}/compile-video")
async def compile_annotated_video(
    job_id: str,
    mode: str = Query("original", description="'original' (original duration) or 'sampled' (sampled frames only)"),
):
    """
    Compile and export an annotated video with bounding boxes and action vectors.
    """
    job = video_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job must be completed before compiling video (current status: {job.status}).")

    if mode == "sampled":
        if not job.sampled_video_path.exists():
            raise HTTPException(status_code=500, detail="Sampled video compilation failed or is missing.")
        return {"success": True, "mode": "sampled", "download_url": f"/api/video/jobs/{job_id}/annotated-video?mode=sampled"}

    # Mode: original duration
    try:
        fps = job.video_metadata.fps if job.video_metadata else 25.0
        video_annotation_service.compile_original_duration_video(
            original_video_path=job.video_path,
            predictions_by_frame_idx=job.predictions_by_frame_idx,
            output_path=job.annotated_video_path,
            fps=fps,
            hold_window_frames=int(fps * job.sampling_interval),
        )
        return {"success": True, "mode": "original", "download_url": f"/api/video/jobs/{job_id}/annotated-video?mode=original"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Compilation error: {exc}")


@router.get("/jobs/{job_id}/annotated-video")
async def download_annotated_video(
    job_id: str,
    mode: str = Query("original", description="'original' or 'sampled'"),
):
    """Download the generated annotated video file."""
    job = video_job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    target_path = job.sampled_video_path if mode == "sampled" else job.annotated_video_path
    if not target_path.exists():
        # Fallback to sampled video if original wasn't compiled yet
        if job.sampled_video_path.exists():
            target_path = job.sampled_video_path
        else:
            raise HTTPException(status_code=404, detail="Annotated video has not been compiled yet.")

    return FileResponse(
        str(target_path),
        media_type="video/mp4",
        filename=f"muren_annotated_{job.job_id}_{mode}.mp4",
    )


@router.delete("/jobs/{job_id}")
async def cancel_or_delete_job(job_id: str):
    """Cancel processing and purge temporary job files."""
    deleted = video_job_manager.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"success": True, "message": "Job cancelled and temporary files removed."}

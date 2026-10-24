"""
Video job manager service.
Handles background job orchestration, progress tracking, cancellation tokens,
frame caching, and file persistence.
"""
import os
import time
import json
import uuid
import shutil
import threading
from pathlib import Path
from typing import Dict, Optional, List
import cv2
from PIL import Image

from ..core.config import settings
from ..schemas.video import (
    VideoMetadata,
    VideoJobStatus,
    FrameAnalysisResult,
    FramePrediction,
)
from .video_decoder import video_decoder_service
from .video_inference import video_inference_service
from .video_annotation import video_annotation_service


class VideoJob:
    """Represents a single video processing task."""

    def __init__(
        self,
        job_id: str,
        filename: str,
        video_path: Path,
        sampling_mode: str,
        sampling_interval: float,
        max_frames: int,
        manual_timestamps: Optional[List[float]],
        min_action_score: float,
        min_object_score: float,
        max_interactions: int,
    ) -> None:
        self.job_id = job_id
        self.filename = filename
        self.video_path = video_path
        self.sampling_mode = sampling_mode
        self.sampling_interval = sampling_interval
        self.max_frames = max_frames
        self.manual_timestamps = manual_timestamps
        self.min_action_score = min_action_score
        self.min_object_score = min_object_score
        self.max_interactions = max_interactions

        self.status = "queued"
        self.message = "Job initialized in queue"
        self.progress_percent = 0.0
        self.total_frames_to_process = 0
        self.processed_frames = 0
        self.current_timestamp = 0.0
        self.error: Optional[str] = None
        self.created_at = time.time()
        self.completed_at: Optional[float] = None

        self.video_metadata: Optional[VideoMetadata] = None
        self.results: List[FrameAnalysisResult] = []
        self.predictions_by_frame_idx: Dict[int, List[FramePrediction]] = {}
        self.cancel_requested = threading.Event()

        # Output paths
        self.results_dir = settings.video_results_dir / job_id
        self.frames_dir = self.results_dir / "frames"
        self.annotated_video_path = self.results_dir / "annotated_video.mp4"
        self.sampled_video_path = self.results_dir / "sampled_video.mp4"


class VideoJobManager:
    """Manages video job lifecycles and background execution."""

    def __init__(self) -> None:
        self._jobs: Dict[str, VideoJob] = {}
        self._lock = threading.Lock()

    def create_job(
        self,
        filename: str,
        video_path: Path,
        sampling_mode: str = "interval",
        sampling_interval: float = 1.0,
        max_frames: int = 60,
        manual_timestamps: Optional[List[float]] = None,
        min_action_score: float = 0.20,
        min_object_score: float = 0.50,
        max_interactions: int = 5,
    ) -> VideoJob:
        job_id = uuid.uuid4().hex[:12]
        job = VideoJob(
            job_id=job_id,
            filename=filename,
            video_path=video_path,
            sampling_mode=sampling_mode,
            sampling_interval=sampling_interval,
            max_frames=max_frames,
            manual_timestamps=manual_timestamps,
            min_action_score=min_action_score,
            min_object_score=min_object_score,
            max_interactions=max_interactions,
        )

        job.frames_dir.mkdir(parents=True, exist_ok=True)

        with self._lock:
            self._jobs[job_id] = job

        # Launch worker thread
        thread = threading.Thread(
            target=self._run_job_worker,
            args=(job,),
            daemon=True,
            name=f"VideoJob-{job_id}",
        )
        thread.start()

        return job

    def get_job(self, job_id: str) -> Optional[VideoJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def get_status(self, job_id: str) -> Optional[VideoJobStatus]:
        job = self.get_job(job_id)
        if not job:
            return None

        return VideoJobStatus(
            job_id=job.job_id,
            status=job.status,
            filename=job.filename,
            video_metadata=job.video_metadata,
            sampling_mode=job.sampling_mode,
            sampling_interval=job.sampling_interval,
            total_frames_to_process=job.total_frames_to_process,
            processed_frames=job.processed_frames,
            current_timestamp=job.current_timestamp,
            progress_percent=round(job.progress_percent, 1),
            message=job.message,
            error=job.error,
            created_at=job.created_at,
            completed_at=job.completed_at,
            annotated_video_available=job.annotated_video_path.exists(),
            sampled_video_available=job.sampled_video_path.exists(),
        )

    def cancel_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False
        job.cancel_requested.set()
        job.status = "cancelled"
        job.message = "Job cancelled by user"
        return True

    def delete_job(self, job_id: str) -> bool:
        job = self.get_job(job_id)
        if not job:
            return False

        job.cancel_requested.set()
        # Clean up files
        try:
            if job.results_dir.exists():
                shutil.rmtree(job.results_dir, ignore_errors=True)
            if job.video_path.exists() and "test" not in job.video_path.name:
                job.video_path.unlink(missing_ok=True)
        except Exception as e:
            print(f"[VideoJobManager] Cleanup error: {e}")

        with self._lock:
            self._jobs.pop(job_id, None)

        return True

    def _run_job_worker(self, job: VideoJob) -> None:
        """Sequential background processing worker for a video job."""
        try:
            job.status = "decoding"
            job.message = "Extracting video metadata and timestamps..."

            # 1. Extract metadata
            metadata = video_decoder_service.get_metadata(job.video_path)
            job.video_metadata = metadata

            # 2. Compute sample timestamps
            if job.sampling_mode == "motion_adaptive":
                job.message = "Analyzing optical motion energy to detect action keyframes..."
                timestamps = video_decoder_service.calculate_motion_adaptive_timestamps(
                    video_path=job.video_path,
                    duration=metadata.duration_seconds,
                    fps=metadata.fps,
                    max_frames=job.max_frames,
                )
            else:
                timestamps = video_decoder_service.calculate_timestamps(
                    duration=metadata.duration_seconds,
                    fps=metadata.fps,
                    mode=job.sampling_mode,
                    interval=job.sampling_interval,
                    max_frames=job.max_frames,
                    manual_timestamps=job.manual_timestamps,
                )

            job.total_frames_to_process = len(timestamps)
            if job.total_frames_to_process == 0:
                raise ValueError("No valid frame timestamps to process.")

            job.status = "processing"
            job.message = f"Processing {job.total_frames_to_process} sampled frames with MUREN..."

            cap = cv2.VideoCapture(str(job.video_path))
            if not cap.isOpened():
                raise ValueError("Could not open video stream for decoding.")

            results: List[FrameAnalysisResult] = []
            annotated_frames_rgb = []

            try:
                for idx, t_sec in enumerate(timestamps):
                    if job.cancel_requested.is_set():
                        job.status = "cancelled"
                        job.message = "Processing was cancelled."
                        return

                    job.current_timestamp = t_sec
                    job.message = f"Inference on frame {idx + 1}/{job.total_frames_to_process} (T={t_sec:.2f}s)"

                    extracted = video_decoder_service.extract_frame_rgb(cap, t_sec, metadata.fps)
                    if extracted is None:
                        # Log and skip frame without failing entire video
                        continue

                    frame_rgb, actual_frame_idx = extracted
                    h, w = frame_rgb.shape[:2]

                    # Run MUREN Inference on frame
                    preds, inf_ms, _ = video_inference_service.run_frame_inference(
                        frame_rgb,
                        min_action_score=job.min_action_score,
                        min_object_score=job.min_object_score,
                        max_interactions=job.max_interactions,
                    )

                    job.predictions_by_frame_idx[actual_frame_idx] = preds

                    # Generate annotated frame
                    annotated_rgb = video_annotation_service.annotate_frame_rgb(
                        frame_rgb,
                        preds,
                        timestamp_sec=t_sec,
                    )
                    annotated_frames_rgb.append(annotated_rgb)

                    # Save images to disk
                    frame_id = f"f_{idx:03d}"
                    orig_path = job.frames_dir / f"{frame_id}_original.jpg"
                    annot_path = job.frames_dir / f"{frame_id}_annotated.jpg"
                    thumb_path = job.frames_dir / f"{frame_id}_thumb.jpg"

                    # Original
                    Image.fromarray(frame_rgb).save(str(orig_path), quality=85)
                    # Annotated
                    Image.fromarray(annotated_rgb).save(str(annot_path), quality=88)
                    # Thumbnail (resize to 240px wide)
                    thumb_w = 240
                    thumb_h = int(h * (thumb_w / w))
                    Image.fromarray(annotated_rgb).resize((thumb_w, thumb_h)).save(str(thumb_path), quality=75)

                    # URLs
                    thumb_url = f"/api/video/jobs/{job.job_id}/frames/{frame_id}/thumb"
                    annot_url = f"/api/video/jobs/{job.job_id}/frames/{frame_id}/annotated"

                    res = FrameAnalysisResult(
                        frame_id=frame_id,
                        frame_index=actual_frame_idx,
                        timestamp_seconds=t_sec,
                        width=w,
                        height=h,
                        inference_time_ms=inf_ms,
                        accepted_interactions_count=len(preds),
                        predictions=preds,
                        thumbnail_url=thumb_url,
                        annotated_frame_url=annot_url,
                    )
                    results.append(res)

                    job.processed_frames = idx + 1
                    job.progress_percent = round(((idx + 1) / job.total_frames_to_process) * 100.0, 1)

            finally:
                cap.release()

            job.results = results

            # Compile default sampled-frame export video in background
            if annotated_frames_rgb:
                try:
                    video_annotation_service.compile_sampled_video(
                        annotated_frames_rgb,
                        job.sampled_video_path,
                        fps=2.0,
                    )
                except Exception as ex:
                    print(f"[VideoJobManager] Sampled video compile notice: {ex}")

            # Mark completed
            job.status = "completed"
            job.progress_percent = 100.0
            job.completed_at = time.time()
            job.message = f"Completed analysis of {len(results)} frames successfully."

            # Save json results cache
            try:
                results_json = {
                    "job_id": job.job_id,
                    "filename": job.filename,
                    "metadata": job.video_metadata.model_dump() if job.video_metadata else None,
                    "frames": [r.model_dump() for r in results],
                }
                with open(job.results_dir / "results.json", "w", encoding="utf-8") as f:
                    json.dump(results_json, f, indent=2)
            except Exception as e:
                print(f"[VideoJobManager] Failed to cache json: {e}")

        except Exception as exc:
            import traceback
            traceback.print_exc()
            job.status = "failed"
            job.error = str(exc)
            job.message = f"Job failed: {exc}"
            job.completed_at = time.time()


video_job_manager = VideoJobManager()

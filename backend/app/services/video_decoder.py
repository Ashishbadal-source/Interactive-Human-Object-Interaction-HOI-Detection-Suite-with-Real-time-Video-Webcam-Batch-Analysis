"""
Video decoding and frame sampling service using OpenCV.
Handles video validation, metadata extraction, and precise frame extraction.
"""
from pathlib import Path
from typing import List, Tuple, Optional
import cv2
import numpy as np

from ..schemas.video import VideoMetadata


class VideoDecoderService:
    """Provides video decoding, validation, and frame extraction utilities."""

    @staticmethod
    def get_metadata(video_path: Path) -> VideoMetadata:
        """
        Open a video file, validate its readability, and return structured metadata.
        """
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found at {video_path}")

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(
                "Unable to open video file. The codec may not be supported or the file may be corrupted."
            )

        try:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
            codec = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)]).strip() or "unknown"

            if fps <= 0 or np.isnan(fps):
                fps = 25.0  # safe fallback if FPS metadata is missing
            if total_frames <= 0 or np.isnan(total_frames):
                total_frames = 1

            duration = float(total_frames / fps) if fps > 0 else 0.0
            file_size = video_path.stat().st_size

            if width <= 0 or height <= 0:
                raise ValueError("Video has invalid dimensions (0x0).")

            return VideoMetadata(
                duration_seconds=round(duration, 3),
                fps=round(fps, 2),
                total_frames=total_frames,
                width=width,
                height=height,
                codec=codec,
                file_size_bytes=file_size,
            )
        finally:
            cap.release()

    @staticmethod
    def calculate_timestamps(
        duration: float,
        fps: float,
        mode: str = "interval",
        interval: float = 1.0,
        max_frames: int = 60,
        manual_timestamps: Optional[List[float]] = None,
    ) -> List[float]:
        """
        Calculate the exact timestamps (in seconds) to extract based on the strategy.
        First frame is always at timestamp 0.0s unless specified otherwise.
        """
        timestamps: List[float] = []

        if mode == "manual" and manual_timestamps:
            valid = [round(t, 3) for t in manual_timestamps if 0.0 <= t <= duration]
            valid = sorted(list(set(valid)))
            return valid[:max_frames]

        if mode == "uniform":
            if max_frames <= 1 or duration <= 0:
                return [0.0]
            step = duration / max_frames
            for i in range(max_frames):
                t = round(i * step, 3)
                if t <= duration:
                    timestamps.append(t)
            return timestamps

        if mode == "motion_adaptive":
            # Handled via calculate_motion_adaptive_timestamps
            pass

        # Default: interval mode
        if interval <= 0:
            interval = 1.0

        current_t = 0.0
        while current_t <= duration and len(timestamps) < max_frames:
            timestamps.append(round(current_t, 3))
            current_t += interval

        return timestamps

    @staticmethod
    def calculate_motion_adaptive_timestamps(
        video_path: Path,
        duration: float,
        fps: float,
        max_frames: int = 60,
        min_separation_seconds: float = 0.8,
    ) -> List[float]:
        """
        Analyze frame difference energy across downsampled frames to identify
        moments of dynamic motion and human-object interactions.
        """
        if duration <= 0:
            return [0.0]

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return VideoDecoderService.calculate_timestamps(duration, fps, mode="uniform", max_frames=max_frames)

        try:
            scores = []  # List[Tuple[timestamp, motion_energy]]
            prev_gray = None
            step_sec = 0.25  # Evaluate motion every 250ms
            curr_t = 0.0

            while curr_t <= duration:
                target_msec = curr_t * 1000.0
                cap.set(cv2.CAP_PROP_POS_MSEC, target_msec)
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                small = cv2.resize(frame, (160, 120))
                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

                if prev_gray is not None:
                    diff = cv2.absdiff(gray, prev_gray)
                    energy = float(np.mean(diff))
                    scores.append((round(curr_t, 3), energy))
                else:
                    scores.append((round(curr_t, 3), 0.0))

                prev_gray = gray
                curr_t += step_sec

            if not scores:
                return [0.0]

            # Prioritize peaks respecting minimum temporal separation
            selected = [0.0]
            candidates = sorted(scores[1:], key=lambda x: x[1], reverse=True)

            for t_val, _ in candidates:
                if len(selected) >= max_frames:
                    break
                if all(abs(t_val - s) >= min_separation_seconds for s in selected):
                    selected.append(t_val)

            # Fill up to min(max_frames, 4) if needed
            if len(selected) < min(max_frames, 4) and len(scores) > len(selected):
                for t_val, _ in candidates:
                    if len(selected) >= max_frames:
                        break
                    if t_val not in selected:
                        selected.append(t_val)

            return sorted(selected)
        finally:
            cap.release()

    @staticmethod
    def extract_frame_rgb(cap: cv2.VideoCapture, timestamp_sec: float, fps: float) -> Optional[Tuple[np.ndarray, int]]:
        """
        Seek to timestamp and decode a frame in RGB format.
        Returns (frame_rgb, frame_index) or None if decoding fails.
        """
        # Seek by milliseconds
        target_msec = max(0.0, timestamp_sec * 1000.0)
        cap.set(cv2.CAP_PROP_POS_MSEC, target_msec)
        ret, frame_bgr = cap.read()

        # Fallback to frame index seek if msec seek failed
        if not ret or frame_bgr is None:
            target_idx = int(round(timestamp_sec * fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame_bgr = cap.read()

        if not ret or frame_bgr is None:
            return None

        actual_idx = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        return frame_rgb, actual_idx


video_decoder_service = VideoDecoderService()

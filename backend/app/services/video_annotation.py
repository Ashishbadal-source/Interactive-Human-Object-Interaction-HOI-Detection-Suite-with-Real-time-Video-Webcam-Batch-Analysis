"""
Video annotation service.
Renders high-contrast bounding boxes, action relationship connectors, and label tags on frames.
Compiles annotated video outputs under both Sampled-Frame and Original-Duration policies.
"""
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import cv2
import numpy as np

from ..schemas.video import FramePrediction


class VideoAnnotationService:
    """Renders visual HOI annotations on video frames and compiles video outputs."""

    # Cyan for Subject (person), Violet for Object (BGR for OpenCV drawing)
    COLOR_SUBJECT_BGR = (212, 182, 6)    # #06b6d4
    COLOR_OBJECT_BGR = (246, 92, 139)    # #8b5cf6
    COLOR_ARROW_BGR = (248, 189, 56)     # #38bdf8

    @classmethod
    def annotate_frame_rgb(
        cls,
        frame_rgb: np.ndarray,
        predictions: List[FramePrediction],
        timestamp_sec: Optional[float] = None,
        is_held_propagation: bool = False,
    ) -> np.ndarray:
        """
        Draw bounding boxes, directional action vectors, and metadata badges on a frame.
        Input is RGB numpy array; returns RGB numpy array.
        """
        # Convert RGB to BGR for OpenCV drawing
        annotated_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        h, w = annotated_bgr.shape[:2]

        for pred in predictions:
            sx1, sy1, sx2, sy2 = [int(v) for v in pred.subject_box]
            ox1, oy1, ox2, oy2 = [int(v) for v in pred.object_box]

            # Clip coordinates
            sx1, sy1 = max(0, sx1), max(0, sy1)
            sx2, sy2 = min(w - 1, sx2), min(h - 1, sy2)
            ox1, oy1 = max(0, ox1), max(0, oy1)
            ox2, oy2 = min(w - 1, ox2), min(h - 1, oy2)

            # Draw Subject Box (Cyan)
            cv2.rectangle(annotated_bgr, (sx1, sy1), (sx2, sy2), cls.COLOR_SUBJECT_BGR, 2)
            cls._draw_badge(
                annotated_bgr,
                "person",
                (sx1, max(18, sy1 - 6)),
                cls.COLOR_SUBJECT_BGR,
                (0, 0, 0),
            )

            # Draw Object Box (Violet)
            cv2.rectangle(annotated_bgr, (ox1, oy1), (ox2, oy2), cls.COLOR_OBJECT_BGR, 2)
            obj_text = f"{pred.object_label} ({int(pred.object_score * 100)}%)"
            cls._draw_badge(
                annotated_bgr,
                obj_text,
                (ox1, max(18, oy1 - 6)),
                cls.COLOR_OBJECT_BGR,
                (255, 255, 255),
            )

            # Draw Action Connector Arrow from Person Center to Object Center
            scx = (sx1 + sx2) // 2
            scy = (sy1 + sy2) // 2
            ocx = (ox1 + ox2) // 2
            ocy = (oy1 + oy2) // 2
            cv2.arrowedLine(
                annotated_bgr,
                (scx, scy),
                (ocx, ocy),
                cls.COLOR_ARROW_BGR,
                2,
                tipLength=0.08,
            )

            # Action Verb Badge along connector or near object
            action_label = f"{pred.primary_action} [{int(pred.primary_action_score * 100)}%]"
            mid_x = (scx + ocx) // 2
            mid_y = (scy + ocy) // 2
            cls._draw_badge(
                annotated_bgr,
                action_label,
                (mid_x, mid_y),
                (30, 41, 59),
                (248, 250, 252),
                border_color=cls.COLOR_ARROW_BGR,
            )

        # Draw Frame Watermark / Timestamp Header
        if timestamp_sec is not None:
            time_tag = f"T={timestamp_sec:.2f}s"
            if is_held_propagation:
                time_tag += " (Held Detection)"
            cls._draw_badge(
                annotated_bgr,
                time_tag,
                (14, 26),
                (15, 23, 42),
                (56, 189, 248),
                border_color=(148, 163, 184),
            )

        return cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)

    @classmethod
    def _draw_badge(
        cls,
        img_bgr: np.ndarray,
        text: str,
        origin: Tuple[int, int],
        bg_color: Tuple[int, int, int],
        text_color: Tuple[int, int, int],
        border_color: Optional[Tuple[int, int, int]] = None,
    ) -> None:
        """Draw a text pill with filled background and optional border."""
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.45
        thickness = 1
        (tw, th), baseline = cv2.getTextSize(text, font, scale, thickness)

        x, y = origin
        pad = 4
        x1 = max(0, x - pad)
        y1 = max(0, y - th - pad)
        x2 = min(img_bgr.shape[1] - 1, x + tw + pad)
        y2 = min(img_bgr.shape[0] - 1, y + baseline + pad)

        cv2.rectangle(img_bgr, (x1, y1), (x2, y2), bg_color, -1)
        if border_color:
            cv2.rectangle(img_bgr, (x1, y1), (x2, y2), border_color, 1)

        cv2.putText(
            img_bgr,
            text,
            (x, y),
            font,
            scale,
            text_color,
            thickness,
            cv2.LINE_AA,
        )

    @classmethod
    def compile_sampled_video(
        cls,
        annotated_frames_rgb: List[np.ndarray],
        output_path: Path,
        fps: float = 2.0,
    ) -> Path:
        """
        Compile an output MP4 containing only the analyzed sampled frames.
        """
        if not annotated_frames_rgb:
            raise ValueError("No frames provided for sampled video compilation.")

        h, w = annotated_frames_rgb[0].shape[:2]
        output_path.parent.mkdir(parents=True, exist_ok=True)

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        if not writer.isOpened():
            # Fallback to XVID
            fourcc = cv2.VideoWriter_fourcc(*"XVID")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        try:
            for frame_rgb in annotated_frames_rgb:
                frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
                writer.write(frame_bgr)
        finally:
            writer.release()

        return output_path

    @classmethod
    def compile_original_duration_video(
        cls,
        original_video_path: Path,
        predictions_by_frame_idx: Dict[int, List[FramePrediction]],
        output_path: Path,
        fps: float,
        hold_window_frames: int = 25,
    ) -> Path:
        """
        Compile an output video matching the original video's duration and frame rate.
        Propagates sampled HOI annotations across intermediate frames within hold_window_frames.
        """
        cap = cv2.VideoCapture(str(original_video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open original video {original_video_path}")

        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps <= 0:
            fps = float(cap.get(cv2.CAP_PROP_FPS)) or 25.0

        output_path.parent.mkdir(parents=True, exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        if not writer.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*"XVID")
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (w, h))

        current_preds: Optional[List[FramePrediction]] = None
        last_analyzed_idx: int = -9999

        try:
            frame_idx = 0
            while True:
                ret, frame_bgr = cap.read()
                if not ret or frame_bgr is None:
                    break

                # Check if this frame was directly analyzed
                if frame_idx in predictions_by_frame_idx:
                    current_preds = predictions_by_frame_idx[frame_idx]
                    last_analyzed_idx = frame_idx
                    is_held = False
                elif current_preds and (frame_idx - last_analyzed_idx) <= hold_window_frames:
                    is_held = True
                else:
                    current_preds = None
                    is_held = False

                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                if current_preds:
                    annotated_rgb = cls.annotate_frame_rgb(
                        frame_rgb,
                        current_preds,
                        timestamp_sec=round(frame_idx / fps, 2),
                        is_held_propagation=is_held,
                    )
                    out_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
                else:
                    out_bgr = frame_bgr

                writer.write(out_bgr)
                frame_idx += 1
        finally:
            cap.release()
            writer.release()

        return output_path


video_annotation_service = VideoAnnotationService()

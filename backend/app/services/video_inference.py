"""
Video frame inference service.
Reuses the existing pretrained MUREN model from inference_service in a thread-safe manner.
Applies the verified HICO-DET object and verb taxonomies identically to photo analysis.
"""
import time
from typing import List, Dict, Any, Tuple
import numpy as np
import torch
from PIL import Image

from .inference import (
    inference_service,
    OBJECT_NAMES,
    VERB_NAMES,
    _preprocess_image,
    _clip_box,
)
from ..schemas.video import FramePrediction, FrameActionScore


class VideoInferenceService:
    """Runs sequential MUREN inference on individual video frames."""

    def __init__(self) -> None:
        pass

    def run_frame_inference(
        self,
        frame_rgb: np.ndarray,
        min_action_score: float = 0.20,
        min_object_score: float = 0.50,
        max_interactions: int = 5,
    ) -> Tuple[List[FramePrediction], float, int]:
        """
        Run MUREN inference on a single RGB video frame.
        Returns (predictions, inference_ms, total_candidates).
        """
        if not inference_service.model_loaded or inference_service.model is None:
            raise RuntimeError("MUREN model is not loaded. Cannot run frame inference.")

        # Convert numpy RGB to PIL Image
        pil_image = Image.fromarray(frame_rgb)
        original_w, original_h = pil_image.size

        # Preprocess using official pipeline
        tensor, _new_w, _new_h = _preprocess_image(pil_image)

        # Thread-safe forward pass on CPU
        with inference_service._lock:
            t_start = time.perf_counter()
            with torch.no_grad():
                outputs = inference_service.model(tensor)
                target_sizes = torch.tensor([[original_h, original_w]])
                results = inference_service.postprocessors["hoi"](outputs, target_sizes)[0]
            inference_ms = (time.perf_counter() - t_start) * 1000

        # Unpack postprocessor outputs
        verb_scores = results["verb_scores"]        # (64, 117)
        labels = results["labels"]                   # (128,) [64 sub + 64 obj]
        boxes = results["boxes"]                     # (128, 4) xyxy
        sub_ids = results["sub_ids"]                 # (64,)
        obj_ids = results["obj_ids"]                 # (64,)
        obj_scores = results["obj_scores"]           # (64,)

        num_queries = inference_service.args.num_queries
        sub_boxes = boxes[:num_queries]
        obj_boxes = boxes[num_queries:]

        # Filter candidates
        candidates = []
        for qid in range(num_queries):
            top_verb_score = float(verb_scores[qid].max())
            object_score = float(obj_scores[qid])

            if top_verb_score < min_action_score or object_score < min_object_score:
                continue

            # Top 3 actions for this query
            top3_scores, top3_ids = verb_scores[qid].topk(3)
            top3_actions: List[FrameActionScore] = []
            for vid, vscore in zip(top3_ids.tolist(), top3_scores.tolist()):
                verb_name = VERB_NAMES[vid] if vid < len(VERB_NAMES) else f"verb_{vid}"
                top3_actions.append(
                    FrameActionScore(
                        verb_id=vid,
                        verb_name=verb_name,
                        score=round(float(vscore), 4),
                    )
                )

            primary = top3_actions[0]
            obj_label_id = int(labels[obj_ids[qid]])
            obj_name = OBJECT_NAMES[obj_label_id] if obj_label_id < len(OBJECT_NAMES) else f"object_{obj_label_id}"

            sb = _clip_box(sub_boxes[qid].tolist(), original_w, original_h)
            ob = _clip_box(obj_boxes[qid].tolist(), original_w, original_h)

            candidates.append({
                "query_id": int(qid),
                "subject_label": "person",
                "object_label": obj_name,
                "object_label_id": obj_label_id,
                "primary_action": primary.verb_name,
                "primary_action_score": primary.score,
                "object_score": round(object_score, 4),
                "top3_actions": top3_actions,
                "subject_box": sb,
                "object_box": ob,
            })

        # Sort descending by primary action score
        candidates.sort(key=lambda c: c["primary_action_score"], reverse=True)
        total_candidates = len(candidates)
        accepted = candidates[:max_interactions]

        prediction_objs = [
            FramePrediction(
                query_id=c["query_id"],
                subject_label=c["subject_label"],
                object_label=c["object_label"],
                object_label_id=c["object_label_id"],
                primary_action=c["primary_action"],
                primary_action_score=c["primary_action_score"],
                object_score=c["object_score"],
                top3_actions=c["top3_actions"],
                subject_box=c["subject_box"],
                object_box=c["object_box"],
            )
            for c in accepted
        ]

        return prediction_objs, round(inference_ms, 1), total_candidates


video_inference_service = VideoInferenceService()

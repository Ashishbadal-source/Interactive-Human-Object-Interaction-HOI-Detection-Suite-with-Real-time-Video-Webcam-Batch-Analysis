"""
MUREN inference service.

Wraps the existing MUREN model from the repository without duplicating model code.
Loads the checkpoint once at startup and exposes a thread-safe predict() method.
"""
import sys
import time
import threading
import uuid
import math
from pathlib import Path
from types import SimpleNamespace
from typing import Optional
import cv2
import numpy as np

import torch
import torchvision.transforms as T
from PIL import Image, ImageDraw, ImageFont

from ..core.config import settings

# ---------------------------------------------------------------------------
# Add the project root to sys.path so that the original `models`, `util`,
# and `datasets` packages are importable.
# ---------------------------------------------------------------------------
_project_root = str(settings.PROJECT_ROOT)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from models import build_model  # noqa: E402

# ---------------------------------------------------------------------------
# Label mappings
# ---------------------------------------------------------------------------

# COCO 80-class names in the order used by HICO-DET (mapped via _valid_obj_ids).
# This is the standard COCO-to-HICO mapping used by QPIC / CDN / MUREN.
OBJECT_NAMES: list[str] = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus",
    "train", "truck", "boat", "traffic light", "fire hydrant",
    "stop sign", "parking meter", "bench", "bird", "cat", "dog",
    "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
    "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat",
    "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl",
    "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
    "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven",
    "toaster", "sink", "refrigerator", "book", "clock", "vase",
    "scissors", "teddy bear", "hair drier", "toothbrush",
]

# 117 verb classes used by HICO-DET.
# NOTE: This ordering is taken from the existing infer.py in this repository.
# It matches the list commonly used by QPIC / CDN / GEN-VLKT / MUREN for
# HICO-DET.  The mapping has NOT been independently verified against the
# official MATLAB annotation files.  It may differ from the "canonical"
# alphabetical ordering found in some other toolkits.
# If you notice label mismatches, please verify against the checkpoint's
# training dataset.
VERB_NAMES: list[str] = [
    "adjust", "assemble", "block", "blow", "board", "break",
    "brush_with", "buy", "carry", "catch", "chase", "check",
    "clean", "control", "cook", "cut", "cut_with", "direct",
    "drag", "dribble", "drink_with", "drive", "dry", "eat",
    "eat_at", "exit", "feed", "fill", "flip", "flush", "fly",
    "greet", "grind", "groom", "herd", "hit", "hold", "hop_on",
    "hose", "hug", "hunt", "inspect", "install", "jump", "kick",
    "kiss", "lasso", "launch", "lick", "lie_on", "lift", "light",
    "load", "lose", "make", "milk", "move", "no_interaction",
    "open", "operate", "pack", "paint", "park", "pay", "peel",
    "pet", "pick", "pick_up", "point", "pour", "pull", "push",
    "race", "read", "release", "repair", "ride", "row", "run",
    "sail", "scratch", "serve", "set", "shear", "sign", "sip",
    "sit_at", "sit_on", "slide", "smell", "spin", "squeeze",
    "stab", "stand_on", "stand_under", "stick", "stir",
    "stop_at", "straddle", "swing", "tag", "talk_on", "teach",
    "text_on", "throw", "tie", "toast", "train", "turn",
    "type_on", "walk", "wash", "watch", "wave", "wear",
    "wield", "zip",
]

assert len(OBJECT_NAMES) == 80, f"Expected 80 object names, got {len(OBJECT_NAMES)}"
assert len(VERB_NAMES) == 117, f"Expected 117 verb names, got {len(VERB_NAMES)}"


# ---------------------------------------------------------------------------
# Model configuration – mirrors infer.py / test_load.py exactly.
# ---------------------------------------------------------------------------
def _make_args() -> SimpleNamespace:
    return SimpleNamespace(
        backbone="resnet50",
        dilation=False,
        position_embedding="sine",
        hidden_dim=256,
        nheads=8,
        enc_layers=6,
        dec_layers=6,
        dim_feedforward=2048,
        dropout=0.1,
        pre_norm=False,
        num_queries=64,
        num_obj_classes=80,
        num_verb_classes=117,
        aux_loss=True,
        use_matching=False,
        subject_category_id=0,
        verb_loss_type="focal",
        set_cost_class=1,
        set_cost_bbox=2.5,
        set_cost_giou=1,
        set_cost_obj_class=1,
        set_cost_verb_class=1,
        set_cost_matching=1,
        bbox_loss_coef=2.5,
        giou_loss_coef=1,
        obj_loss_coef=1,
        verb_loss_coef=2,
        matching_loss_coef=1,
        eos_coef=0.1,
        alpha=0.5,
        masks=False,
        lr_backbone=0,
        no_aux_loss=False,
        dataset_file="hico",
        device="cpu",
    )


# ---------------------------------------------------------------------------
# Image preprocessing – matches infer.py logic exactly.
# ---------------------------------------------------------------------------
_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD = [0.229, 0.224, 0.225]

_transform = T.Compose([
    T.ToTensor(),
    T.Normalize(_IMAGENET_MEAN, _IMAGENET_STD),
])


def _preprocess_image(image: Image.Image) -> tuple[torch.Tensor, int, int]:
    """
    Resize and normalise an image following the same logic as infer.py:
      - Target shorter side = 800, max longer side = 1333.
      - ImageNet normalisation.
    Returns (tensor [1, 3, H, W], new_w, new_h).
    """
    original_w, original_h = image.size
    new_h = 800
    new_w = int(original_w * new_h / original_h)
    if new_w > 1333:
        new_w = 1333
        new_h = int(original_h * new_w / original_w)
    image_resized = image.resize((new_w, new_h), Image.Resampling.BILINEAR)
    tensor = _transform(image_resized).unsqueeze(0)
    return tensor, new_w, new_h


# ---------------------------------------------------------------------------
# Singleton inference service
# ---------------------------------------------------------------------------
class MURENInferenceService:
    """Thread-safe singleton that holds the MUREN model and runs inference."""

    def __init__(self) -> None:
        self.model = None
        self.postprocessors = None
        self.args = None
        self.model_loaded = False
        self.load_error: Optional[str] = None
        self.checkpoint_epoch: Optional[int] = None
        self._lock = threading.Lock()

    # ---- initialisation --------------------------------------------------

    def load_model(self) -> None:
        """Build and load the pretrained MUREN model.  Called once at startup."""
        checkpoint_path = settings.checkpoint_path
        if not checkpoint_path.exists():
            self.load_error = f"Checkpoint not found at {checkpoint_path}"
            print(f"[MUREN] ERROR: {self.load_error}")
            return

        try:
            print(f"[MUREN] Building model …")
            self.args = _make_args()
            model, _criterion, postprocessors = build_model(self.args)

            print(f"[MUREN] Loading checkpoint from {checkpoint_path} …")
            checkpoint = torch.load(str(checkpoint_path), map_location="cpu")
            model.load_state_dict(checkpoint["model"], strict=True)
            model.to(torch.device("cpu")).eval()

            self.model = model
            self.postprocessors = postprocessors
            self.checkpoint_epoch = checkpoint.get("epoch")
            self.model_loaded = True
            print(f"[MUREN] Model ready (epoch {self.checkpoint_epoch}).")
        except Exception as exc:
            self.load_error = str(exc)
            self.model_loaded = False
            import traceback
            traceback.print_exc()
            print(f"[MUREN] Failed to load model: {self.load_error}")

    # ---- inference -------------------------------------------------------

    def predict(
        self,
        image: Image.Image,
        min_action_score: float = 0.20,
        min_object_score: float = 0.50,
        max_interactions: int = 5,
    ) -> dict:
        """
        Run MUREN inference on a PIL image.

        Returns a dict with keys:
          predictions, annotated_image_path, inference_time_ms,
          original_width, original_height
        """
        if not self.model_loaded or self.model is None:
            raise RuntimeError("Model is not loaded. Cannot run inference.")

        original_w, original_h = image.size
        tensor, _new_w, _new_h = _preprocess_image(image)

        # ---- run model (thread-safe) ------------------------------------
        with self._lock:
            t_start = time.perf_counter()
            with torch.no_grad():
                outputs = self.model(tensor)
                memory = outputs.get("memory")
                rel_out = outputs.get("rel_out")
                target_sizes = torch.tensor([[original_h, original_w]])
                results = self.postprocessors["hoi"](outputs, target_sizes)[0]
            inference_ms = (time.perf_counter() - t_start) * 1000

        # ---- unpack postprocessed results --------------------------------
        verb_scores = results["verb_scores"]        # (64, 117)
        labels = results["labels"]                   # (128,)  [64 sub + 64 obj]
        boxes = results["boxes"]                     # (128, 4) xyxy
        sub_ids = results["sub_ids"]                 # (64,)
        obj_ids = results["obj_ids"]                 # (64,)
        obj_scores = results["obj_scores"]           # (64,)

        sub_boxes = boxes[: self.args.num_queries]   # (64, 4)
        obj_boxes = boxes[self.args.num_queries :]   # (64, 4)

        # ---- filter candidates -------------------------------------------
        candidates = []
        for query_id in range(self.args.num_queries):
            top_verb_score = float(verb_scores[query_id].max())
            object_score = float(obj_scores[query_id])
            if top_verb_score < min_action_score or object_score < min_object_score:
                continue

            # top 3 actions
            top3_scores, top3_ids = verb_scores[query_id].topk(3)
            top3_actions = []
            for vid, vscore in zip(top3_ids.tolist(), top3_scores.tolist()):
                top3_actions.append({
                    "verb_id": vid,
                    "verb_name": VERB_NAMES[vid] if vid < len(VERB_NAMES) else f"verb_{vid}",
                    "score": round(vscore, 4),
                })

            primary = top3_actions[0]
            obj_label_id = int(labels[obj_ids[query_id]])
            obj_name = OBJECT_NAMES[obj_label_id] if obj_label_id < len(OBJECT_NAMES) else f"object_{obj_label_id}"

            sb = _clip_box(sub_boxes[query_id].tolist(), original_w, original_h)
            ob = _clip_box(obj_boxes[query_id].tolist(), original_w, original_h)

            candidates.append({
                "query_id": int(query_id),
                "subject_label": "person",
                "object_label": obj_name,
                "object_label_id": obj_label_id,
                "primary_action": primary["verb_name"],
                "primary_action_score": primary["score"],
                "object_score": round(object_score, 4),
                "top3_actions": top3_actions,
                "subject_box": sb,
                "object_box": ob,
            })

        # Sort by primary action score descending
        candidates.sort(key=lambda c: c["primary_action_score"], reverse=True)

        # Limit to max_interactions
        accepted = candidates[:max_interactions]

        # ---- generate Explainable AI attention heatmaps ------------------
        result_id = uuid.uuid4().hex[:12]
        for cand in accepted:
            xai_path = self._generate_attention_heatmap(memory, rel_out, cand["query_id"], image, result_id)
            if xai_path and xai_path.exists():
                cand["attention_heatmap_url"] = f"/api/result/{result_id}/xai/{cand['query_id']}"

        # ---- draw annotated image ----------------------------------------
        annotated_path = self._draw_annotations(image, accepted, result_id)
        original_path = self._save_original(image, result_id)

        return {
            "result_id": result_id,
            "predictions": accepted,
            "total_candidates_before_limit": len(candidates),
            "inference_time_ms": round(inference_ms, 1),
            "original_width": original_w,
            "original_height": original_h,
            "annotated_image_path": str(annotated_path),
            "original_image_path": str(original_path),
        }

    def _generate_attention_heatmap(
        self,
        memory: Optional[torch.Tensor],
        rel_out: Optional[torch.Tensor],
        query_id: int,
        original_image: Image.Image,
        result_id: str,
    ) -> Optional[Path]:
        """
        Generate Explainable AI (XAI) cross-attention activation heatmap for an interaction query.
        """
        try:
            if memory is None or rel_out is None:
                return None

            # rel_out shape: (layers, queries, bs, dim) or (queries, bs, dim)
            if rel_out.dim() == 4:
                q_vec = rel_out[-1, query_id, 0]
            else:
                q_vec = rel_out[query_id, 0]

            feat_map = memory[0]  # shape: (256, h, w)
            attn = torch.einsum("c,chw->hw", q_vec, feat_map)
            attn = torch.relu(attn)

            min_val = float(attn.min())
            max_val = float(attn.max())
            if max_val > min_val:
                attn = (attn - min_val) / (max_val - min_val)

            orig_w, orig_h = original_image.size
            attn_resized = torch.nn.functional.interpolate(
                attn.unsqueeze(0).unsqueeze(0),
                size=(orig_h, orig_w),
                mode="bilinear",
                align_corners=False,
            )[0, 0].cpu().numpy()

            heatmap_u8 = (attn_resized * 255.0).astype(np.uint8)
            heatmap_color = cv2.applyColorMap(heatmap_u8, cv2.COLORMAP_TURBO)
            heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

            orig_np = np.array(original_image)
            blended = cv2.addWeighted(orig_np, 0.40, heatmap_color, 0.60, 0)

            settings.results_dir.mkdir(parents=True, exist_ok=True)
            out_path = settings.results_dir / f"{result_id}_xai_{query_id}.jpg"
            Image.fromarray(blended).save(out_path, format="JPEG", quality=90)
            return out_path
        except Exception as e:
            print(f"[MUREN XAI] Heatmap generation failed for query {query_id}: {e}")
            return None

    # ---- visualisation ---------------------------------------------------

    def _draw_annotations(
        self,
        image: Image.Image,
        predictions: list[dict],
        result_id: str,
    ) -> Path:
        """Draw bounding boxes and labels on the image and save."""
        output_image = image.copy()
        draw = ImageDraw.Draw(output_image)

        # Colours
        sub_colour = "#06b6d4"   # cyan-500
        obj_colour = "#8b5cf6"   # violet-500

        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except (IOError, OSError):
            font = ImageFont.load_default()

        for idx, pred in enumerate(predictions):
            sb = pred["subject_box"]
            ob = pred["object_box"]

            # Subject box (cyan)
            draw.rectangle(sb, outline=sub_colour, width=3)
            sub_label = f"person"
            _draw_label_bg(draw, sb[0], max(0, sb[1] - 20), sub_label, sub_colour, font)

            # Object box (violet)
            draw.rectangle(ob, outline=obj_colour, width=3)
            obj_label = f"{pred['object_label']}: {pred['primary_action']} ({pred['primary_action_score']:.2f})"
            _draw_label_bg(draw, ob[0], max(0, ob[1] - 20), obj_label, obj_colour, font)

        # Save
        results_dir = settings.results_dir
        results_dir.mkdir(parents=True, exist_ok=True)
        output_path = results_dir / f"{result_id}_annotated.jpg"
        output_image.save(str(output_path), quality=92)
        return output_path

    def _save_original(self, image: Image.Image, result_id: str) -> Path:
        """Save the original uploaded image for later retrieval."""
        results_dir = settings.results_dir
        results_dir.mkdir(parents=True, exist_ok=True)
        output_path = results_dir / f"{result_id}_original.jpg"
        image.save(str(output_path), quality=95)
        return output_path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clip_box(box: list[float], w: int, h: int) -> list[float]:
    """Clip xyxy box coordinates to valid image boundaries."""
    x1, y1, x2, y2 = box
    return [
        round(max(0, min(w - 1, x1)), 1),
        round(max(0, min(h - 1, y1)), 1),
        round(max(0, min(w - 1, x2)), 1),
        round(max(0, min(h - 1, y2)), 1),
    ]


def _draw_label_bg(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    text: str,
    colour: str,
    font,
) -> None:
    """Draw a text label with a semi-opaque background rectangle."""
    bbox = draw.textbbox((x, y), text, font=font)
    draw.rectangle(
        [bbox[0] - 2, bbox[1] - 2, bbox[2] + 2, bbox[3] + 2],
        fill=colour,
    )
    draw.text((x, y), text, fill="white", font=font)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
inference_service = MURENInferenceService()

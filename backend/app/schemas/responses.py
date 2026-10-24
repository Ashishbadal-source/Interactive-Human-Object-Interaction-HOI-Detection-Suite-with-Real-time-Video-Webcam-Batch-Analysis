"""
Pydantic response schemas for the MUREN AI API.
"""
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    model_loaded: bool
    device: str = Field(..., examples=["cpu"])


class ModelInfoResponse(BaseModel):
    model_name: str = "MUREN"
    task: str = "Human-Object Interaction Detection"
    dataset: str = "HICO-DET"
    checkpoint: str = "hico-best.pth"
    num_object_classes: int = 80
    num_verb_classes: int = 117
    num_queries: int = 64
    device: str = "cpu"
    model_loaded: bool
    checkpoint_epoch: int | None = None
    load_error: str | None = None
    verb_mapping_verified: bool = False
    verb_mapping_note: str = (
        "Verb names are taken from the repository's infer.py and match the "
        "ordering used by QPIC/CDN/MUREN codebases.  They have NOT been "
        "independently verified against the official HICO-DET MATLAB files."
    )


class ActionScore(BaseModel):
    verb_id: int
    verb_name: str
    score: float


class Prediction(BaseModel):
    query_id: int
    subject_label: str
    object_label: str
    object_label_id: int
    primary_action: str
    primary_action_score: float
    object_score: float
    top3_actions: list[ActionScore]
    subject_box: list[float] = Field(..., description="[x1, y1, x2, y2] in original image coords")
    object_box: list[float] = Field(..., description="[x1, y1, x2, y2] in original image coords")
    attention_heatmap_url: str | None = Field(None, description="URL to the XAI attention heatmap for this query")


class PredictResponse(BaseModel):
    success: bool
    result_id: str
    filename: str
    original_width: int
    original_height: int
    inference_time_ms: float
    total_candidates: int
    predictions: list[Prediction]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: str | None = None

"""
Pydantic schemas for the MUREN AI Video Analysis Module.
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class VideoMetadata(BaseModel):
    duration_seconds: float
    fps: float
    total_frames: int
    width: int
    height: int
    codec: str
    file_size_bytes: int


class FrameActionScore(BaseModel):
    verb_id: int
    verb_name: str
    score: float


class FramePrediction(BaseModel):
    query_id: int
    subject_label: str = "person"
    object_label: str
    object_label_id: int
    primary_action: str
    primary_action_score: float
    object_score: float
    top3_actions: List[FrameActionScore]
    subject_box: List[float] = Field(..., description="[x1, y1, x2, y2] in original frame coordinates")
    object_box: List[float] = Field(..., description="[x1, y1, x2, y2] in original frame coordinates")
    attention_heatmap_url: Optional[str] = Field(None, description="URL to the XAI attention heatmap for this interaction")


class FrameAnalysisResult(BaseModel):
    frame_id: str
    frame_index: int
    timestamp_seconds: float
    width: int
    height: int
    inference_time_ms: float
    accepted_interactions_count: int
    predictions: List[FramePrediction]
    thumbnail_url: str
    annotated_frame_url: str


class VideoJobStatus(BaseModel):
    job_id: str
    status: str = Field(..., description="queued, decoding, processing, completed, failed, cancelled")
    filename: str
    video_metadata: Optional[VideoMetadata] = None
    sampling_mode: str = "interval"
    sampling_interval: float = 1.0
    total_frames_to_process: int = 0
    processed_frames: int = 0
    current_timestamp: float = 0.0
    progress_percent: float = 0.0
    message: str = ""
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None
    annotated_video_available: bool = False
    sampled_video_available: bool = False


class ActionInterval(BaseModel):
    interval_id: str
    action: str
    object_label: str
    start_timestamp: float
    end_timestamp: float
    duration_seconds: float
    frame_count: int
    avg_action_score: float
    avg_object_score: float
    peak_action_score: float
    sample_timestamps: List[float] = []


class VideoJobResultsResponse(BaseModel):
    job_id: str
    status: str
    video_metadata: Optional[VideoMetadata] = None
    total_analyzed_frames: int
    total_detected_interactions: int
    frames: List[FrameAnalysisResult]
    action_intervals: List[ActionInterval] = []


class AnnotatedVideoGenerateRequest(BaseModel):
    mode: str = Field("original", description="'original' (original duration with timestamp-based frame hold) or 'sampled' (analyzed frames only)")
    fps: Optional[float] = Field(None, description="Playback FPS for sampled mode")


class SampleVideoItem(BaseModel):
    filename: str
    title: str
    description: str
    url: str
    duration_seconds: float
    size_bytes: int

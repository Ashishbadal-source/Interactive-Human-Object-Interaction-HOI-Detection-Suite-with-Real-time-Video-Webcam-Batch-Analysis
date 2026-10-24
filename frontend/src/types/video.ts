export interface VideoMetadata {
  duration_seconds: number;
  fps: number;
  total_frames: number;
  width: number;
  height: number;
  codec: string;
  file_size_bytes: number;
}

export interface FrameActionScore {
  verb_id: number;
  verb_name: string;
  score: number;
}

export interface FramePrediction {
  query_id: number;
  subject_label: string;
  object_label: string;
  object_label_id: number;
  primary_action: string;
  primary_action_score: number;
  object_score: number;
  top3_actions: FrameActionScore[];
  subject_box: [number, number, number, number];
  object_box: [number, number, number, number];
}

export interface FrameAnalysisResult {
  frame_id: string;
  frame_index: number;
  timestamp_seconds: number;
  width: number;
  height: number;
  inference_time_ms: number;
  accepted_interactions_count: number;
  predictions: FramePrediction[];
  thumbnail_url: string;
  annotated_frame_url: string;
}

export interface VideoJobStatus {
  job_id: string;
  status: 'queued' | 'decoding' | 'processing' | 'completed' | 'failed' | 'cancelled';
  filename: string;
  video_metadata: VideoMetadata | null;
  sampling_mode: string;
  sampling_interval: number;
  total_frames_to_process: number;
  processed_frames: number;
  current_timestamp: number;
  progress_percent: number;
  message: string;
  error: string | null;
  created_at: number;
  completed_at: number | null;
  annotated_video_available: boolean;
  sampled_video_available: boolean;
}

export interface ActionInterval {
  interval_id: string;
  action: string;
  object_label: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_seconds: number;
  frame_count: number;
  avg_action_score: number;
  avg_object_score: number;
  peak_action_score: number;
  sample_timestamps: number[];
}

export interface VideoJobResultsResponse {
  job_id: string;
  status: string;
  video_metadata: VideoMetadata | null;
  total_analyzed_frames: number;
  total_detected_interactions: number;
  frames: FrameAnalysisResult[];
  action_intervals: ActionInterval[];
}

export interface SampleVideoItem {
  filename: string;
  title: string;
  description: string;
  url: string;
  duration_seconds: number;
  size_bytes: number;
}

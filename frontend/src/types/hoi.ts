export interface ActionScore {
  verb_id: number;
  verb_name: string;
  score: number;
}

export interface Prediction {
  query_id: number;
  subject_label: string;
  object_label: string;
  object_label_id: number;
  primary_action: string;
  primary_action_score: number;
  object_score: number;
  top3_actions: ActionScore[];
  subject_box: [number, number, number, number]; // [x1, y1, x2, y2]
  object_box: [number, number, number, number];  // [x1, y1, x2, y2]
  attention_heatmap_url?: string;
}

export interface PredictResponse {
  success: boolean;
  result_id: string;
  filename: string;
  original_width: number;
  original_height: number;
  inference_time_ms: number;
  total_candidates: number;
  predictions: Prediction[];
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
}

export interface ModelInfoResponse {
  model_name: string;
  task: string;
  dataset: string;
  checkpoint: string;
  num_object_classes: number;
  num_verb_classes: number;
  num_queries: number;
  device: string;
  model_loaded: boolean;
  checkpoint_epoch: number | null;
  load_error: string | null;
  verb_mapping_verified: boolean;
  verb_mapping_note: string;
}

export interface SampleImage {
  filename: string;
  label: string;
  url: string;
  size_bytes: number;
}

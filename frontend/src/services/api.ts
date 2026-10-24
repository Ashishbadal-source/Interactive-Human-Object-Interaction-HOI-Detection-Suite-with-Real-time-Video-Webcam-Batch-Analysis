import type { HealthResponse, ModelInfoResponse, PredictResponse, SampleImage } from '../types/hoi';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
  return res.json();
}

export async function fetchModelInfo(): Promise<ModelInfoResponse> {
  const res = await fetch('/api/model-info');
  if (!res.ok) throw new Error(`Failed to load model info: ${res.status}`);
  return res.json();
}

export async function fetchSamples(): Promise<SampleImage[]> {
  try {
    const res = await fetch('/api/samples');
    if (!res.ok) return [];
    const data = await res.json();
    return data.samples || [];
  } catch {
    return [];
  }
}

export async function runPredict(
  file: File | Blob,
  fileName: string = 'image.jpg',
  minActionScore: number = 0.20,
  minObjectScore: number = 0.50,
  maxInteractions: number = 5
): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append('image', file, fileName);
  formData.append('min_action_score', minActionScore.toString());
  formData.append('min_object_score', minObjectScore.toString());
  formData.append('max_interactions', maxInteractions.toString());

  const res = await fetch('/api/predict', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = `Inference failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
      else if (errJson.error) errorDetail = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

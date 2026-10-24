import type {
  SampleVideoItem,
  VideoJobStatus,
  VideoJobResultsResponse,
} from '../types/video';

export async function fetchVideoSamples(): Promise<SampleVideoItem[]> {
  try {
    const res = await fetch('/api/video/samples');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createVideoJob(formData: FormData): Promise<VideoJobStatus> {
  const res = await fetch('/api/video/jobs', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let detail = `Job creation failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(detail);
  }

  return await res.json();
}

export async function pollVideoJob(jobId: string): Promise<VideoJobStatus> {
  const res = await fetch(`/api/video/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch job status (${res.status})`);
  }
  return await res.json();
}

export async function fetchVideoResults(jobId: string): Promise<VideoJobResultsResponse> {
  const res = await fetch(`/api/video/jobs/${jobId}/results`);
  if (!res.ok) {
    throw new Error(`Failed to fetch results (${res.status})`);
  }
  return await res.json();
}

export async function compileAnnotatedVideo(
  jobId: string,
  mode: 'original' | 'sampled' = 'original'
): Promise<{ download_url: string }> {
  const res = await fetch(`/api/video/jobs/${jobId}/compile-video?mode=${mode}`, {
    method: 'POST',
  });

  if (!res.ok) {
    let detail = `Video compilation failed (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // fallback
    }
    throw new Error(detail);
  }

  return await res.json();
}

export async function cancelVideoJob(jobId: string): Promise<void> {
  await fetch(`/api/video/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

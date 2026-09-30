import type { AnalysisRecord, ModelPrediction } from '../types';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';
type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: { message?: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init);
  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error((!payload.success && payload.error?.message) || 'The research service could not complete this request.');
  }
  return payload.data;
}

export async function checkModelAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/health`);
    if (!response.ok) return false;
    const status = await response.json() as { inference_available?: boolean };
    return status.inference_available === true;
  } catch { return false; }
}

function toPrediction(record: AnalysisRecord): ModelPrediction {
  const probabilities = record.prediction.probabilities;
  const values = Array.isArray(probabilities)
    ? probabilities
    : ['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'].map(key => probabilities[key] ?? 0);
  return {
    analysis_id: record.analysis_id,
    created_at: record.created_at,
    predicted_class: record.prediction.class,
    class_name: record.prediction.class_name,
    confidence: record.prediction.confidence,
    probabilities: values,
    model_name: record.model.name,
    model_version: record.model.version,
    model_status: 'research-baseline',
    image_url: `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/image`,
    explainability: record.explainability,
  };
}

export async function predictImage(image: File): Promise<ModelPrediction> {
  const body = new FormData();
  body.append('image', image);
  return toPrediction(await request<AnalysisRecord>('/analyses', { method: 'POST', body }));
}

export async function getAnalysis(analysisId: string): Promise<ModelPrediction> {
  return toPrediction(await request<AnalysisRecord>(`/analyses/${encodeURIComponent(analysisId)}`));
}

export async function getAnalysisHistory(page = 1, limit = 20): Promise<{ items: AnalysisRecord[]; page: number; limit: number; total: number }> {
  return request(`/analyses?page=${page}&limit=${limit}`);
}

export async function markReportGenerated(analysisId: string): Promise<void> {
  await request(`/analyses/${encodeURIComponent(analysisId)}/report`, { method: 'POST' });
}

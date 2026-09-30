import type { ModelPrediction } from '../types';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function checkModelAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/api/health`);
    if (!response.ok) return false;
    const status = await response.json() as { inference_available?: boolean };
    return status.inference_available === true;
  } catch { return false; }
}

export async function predictImage(image: File): Promise<ModelPrediction> {
  const body = new FormData();
  body.append('image', image);
  const response = await fetch(`${apiBase}/api/predict`, { method: 'POST', body });
  const payload = await response.json() as ModelPrediction | { error?: string };
  if (!response.ok) throw new Error('error' in payload && payload.error ? payload.error : 'Analysis could not be completed.');
  const prediction = payload as ModelPrediction;
  return { ...prediction, image_url: /^https?:\/\//.test(prediction.image_url) ? prediction.image_url : `${apiBase}${prediction.image_url}` };
}

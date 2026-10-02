import type { AnalysisRecord, ModelPrediction } from '../types';

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const CLASS_NAMES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR'];
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
  let values = Array.isArray(probabilities)
    ? probabilities
    : ['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'].map(key => probabilities[key] ?? 0);
  const individualModels = record.prediction.individual_models ?? {};
  const individualRows = Object.values(individualModels).map(model => model.probabilities);
  if (individualRows.length === 4 && individualRows.every(row => row.length === CLASS_NAMES.length)) {
    values = CLASS_NAMES.map((_, index) => individualRows.reduce((total, row) => total + row[index], 0) / individualRows.length);
  }
  const probabilityClass = values.reduce((best, value, index) => value > values[best] ? index : best, 0);
  const consistencyCorrected = record.prediction.class !== probabilityClass;
  const hasPerModelExplanations = Object.keys(record.explainability.models ?? {}).length > 0;
  const legacyExplanationMatchesDisplayedClass = !consistencyCorrected || hasPerModelExplanations;
  const explanationBase = `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/explanations`;
  return {
    analysis_id: record.analysis_id,
    created_at: record.created_at,
    predicted_class: probabilityClass,
    class_name: CLASS_NAMES[probabilityClass],
    confidence: values[probabilityClass],
    probabilities: values,
    consistency_corrected: consistencyCorrected,
    individual_models: individualModels,
    model_name: record.model.name,
    model_version: record.model.version,
    model_status: 'research-baseline',
    image_url: `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/image`,
    preprocessing: {
      filtered_url: record.preprocessing?.filtered_file ? `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/preprocessing/filtered` : undefined,
      clahe_green_url: record.preprocessing?.clahe_green_file ? `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/preprocessing/clahe-green` : undefined,
    },
    explainability: {
      gradcam_available: record.explainability.gradcam_available && legacyExplanationMatchesDisplayedClass,
      shap_available: record.explainability.shap_available && legacyExplanationMatchesDisplayedClass,
      gradcam_url: record.explainability.gradcam_available && legacyExplanationMatchesDisplayedClass ? `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/explanations/gradcam` : undefined,
      shap_url: record.explainability.shap_available && legacyExplanationMatchesDisplayedClass ? `${apiBase}/analyses/${encodeURIComponent(record.analysis_id)}/explanations/shap` : undefined,
      explanation_model: record.explainability.explanation_model ?? undefined,
      target_class: record.explainability.target_class,
      models: Object.fromEntries(Object.entries(record.explainability.models ?? {}).map(([name, item]) => [name, {
        target_class: item.target_class,
        gradcam_available: item.gradcam_available,
        shap_available: item.shap_available,
        gradcam_url: item.gradcam_available ? `${explanationBase}/gradcam/${encodeURIComponent(name)}` : undefined,
        shap_url: item.shap_available ? `${explanationBase}/shap/${encodeURIComponent(name)}` : undefined,
      }])),
    },
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

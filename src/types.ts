export interface ModelPrediction {
  analysis_id?: string;
  created_at?: string;
  predicted_class: number;
  class_name: string;
  confidence: number;
  probabilities: number[];
  model_name: string;
  model_version: string;
  model_status: string;
  image_url: string;
  explainability?: { gradcam_available: boolean; shap_available: boolean };
}

export interface AnalysisRecord {
  analysis_id: string;
  created_at: string;
  status: string;
  prediction: { class: number; class_name: string; confidence: number; probabilities: Record<string, number> | number[] };
  model: { name: string; version: string };
  explainability: { gradcam_available: boolean; shap_available: boolean };
}

export type Page = 'Home' | 'Analysis' | 'Results' | 'History' | 'Research' | 'Reports' | 'About';

export interface ModelPrediction {
  analysis_id?: string;
  created_at?: string;
  predicted_class: number;
  class_name: string;
  confidence: number;
  probabilities: number[];
  consistency_corrected?: boolean;
  individual_models?: Record<string, {
    predicted_class: number;
    class_name: string;
    confidence: number;
    probabilities: number[];
  }>;
  model_name: string;
  model_version: string;
  model_status: string;
  image_url: string;
  preprocessing?: {
    filtered_url?: string;
    clahe_green_url?: string;
  };
  explainability?: {
    gradcam_available: boolean;
    shap_available: boolean;
    gradcam_url?: string;
    shap_url?: string;
    explanation_model?: string;
    target_class?: number;
    models?: Record<string, {
      target_class: number;
      gradcam_available: boolean;
      shap_available: boolean;
      gradcam_url?: string;
      shap_url?: string;
    }>;
  };
}

export interface AnalysisRecord {
  analysis_id: string;
  created_at: string;
  status: string;
  prediction: {
    class: number;
    class_name: string;
    confidence: number;
    probabilities: Record<string, number> | number[];
    individual_models?: Record<string, {
      predicted_class: number;
      class_name: string;
      confidence: number;
      probabilities: number[];
    }>;
  };
  model: { name: string; version: string };
  preprocessing?: {
    filtered_file?: string | null;
    clahe_green_file?: string | null;
  };
  explainability: {
    gradcam_available: boolean;
    shap_available: boolean;
    gradcam_file?: string | null;
    shap_file?: string | null;
    explanation_model?: string | null;
    target_class?: number;
    models?: Record<string, {
      target_class: number;
      gradcam_available: boolean;
      shap_available: boolean;
      gradcam_file?: string | null;
      shap_file?: string | null;
    }>;
  };
}

export type Page = 'Home' | 'Analysis' | 'Results' | 'History' | 'Research' | 'Reports' | 'About';

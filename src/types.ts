export interface ModelPrediction {
  predicted_class: number;
  class_name: string;
  confidence: number;
  probabilities: number[];
  model_name: string;
  model_version: string;
  model_status: string;
  image_url: string;
}

export type Page = 'Home' | 'Analysis' | 'Results' | 'Research' | 'Reports' | 'About';

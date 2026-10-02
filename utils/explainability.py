"""Generate model-specific Grad-CAM and SHAP image overlays."""
import logging
import os
import hashlib

import cv2
import numpy as np
import torch
from PIL import Image

from utils.gradcam import generate_gradcam_overlay, show_cam_on_image
from utils.preprocessing import IMAGE_SIZE, preprocess_image_inference
from backend.services.model_service import TRANSFORM

logger = logging.getLogger(__name__)

MODEL_FILE_KEYS = {
    'resnet18': 'r18',
    'densenet121': 'dense121',
    'efficientnet_b0': 'effb0',
    'resnext50_32x4d': 'rx50',
}


def _model_file_key(model_name):
    return MODEL_FILE_KEYS.get(model_name, hashlib.sha1(model_name.encode('utf-8')).hexdigest()[:8])


def _shap_map(model, input_tensor, target_class):
    import shap

    class SelectedClass(torch.nn.Module):
        def __init__(self, wrapped_model, class_index):
            super().__init__()
            self.wrapped_model = wrapped_model
            self.class_index = class_index

        def forward(self, batch):
            return self.wrapped_model(batch)[:, self.class_index:self.class_index + 1]

    selected_model = SelectedClass(model, target_class)
    background = torch.zeros_like(input_tensor)
    explainer = shap.GradientExplainer(selected_model, background, batch_size=1)
    values = explainer.shap_values(input_tensor, nsamples=8, rseed=0)
    if isinstance(values, list):
        values = values[0]

    attribution = np.asarray(values, dtype=np.float32)
    if attribution.ndim == 5 and attribution.shape[-1] == 1:
        attribution = attribution[..., 0]
    if attribution.ndim == 4 and attribution.shape[0] == 1:
        attribution = attribution[0]
    if attribution.ndim == 3 and attribution.shape[0] == 3:
        saliency = np.mean(np.abs(attribution), axis=0)
    elif attribution.ndim == 3 and attribution.shape[-1] == 3:
        saliency = np.mean(np.abs(attribution), axis=-1)
    else:
        raise ValueError(f"Unexpected SHAP image attribution shape: {attribution.shape}")

    blur_sigma = max(1.0, min(saliency.shape) * 0.025)
    saliency = cv2.GaussianBlur(saliency, (0, 0), sigmaX=blur_sigma)
    low, high = np.percentile(saliency, (2, 99.5))
    if high - low < 1e-12:
        return np.zeros_like(saliency, dtype=np.float32)
    return np.clip((saliency - low) / (high - low), 0, 1)


def generate_explanations(image_path, loaded_models, prediction, upload_dir):
    """Save per-model explanation overlays for every model that predicted."""
    result = {
        'gradcam_available': False,
        'shap_available': False,
        'gradcam_file': None,
        'shap_file': None,
        'explanation_model': None,
        'target_class': prediction['class'],
        'models': {},
    }
    original = Image.open(image_path).convert('RGB')
    original.thumbnail((768, 768), Image.Resampling.LANCZOS)
    original_rgb = np.asarray(original)
    processed = preprocess_image_inference(image_path, image_size=IMAGE_SIZE)
    if processed is None:
        return result

    filename = os.path.basename(image_path).rsplit('.', 1)[0]
    individual_models = prediction.get('individual_models', {})
    for model_name, model_prediction in individual_models.items():
        model = loaded_models.get(model_name)
        if model is None:
            continue
        target_class = int(model_prediction['predicted_class'])
        model_file_key = _model_file_key(model_name)
        model_result = {
            'target_class': target_class,
            'gradcam_available': False,
            'shap_available': False,
            'gradcam_file': None,
            'shap_file': None,
        }
        try:
            parameter = next(model.parameters())
            input_tensor = TRANSFORM(processed).unsqueeze(0).to(parameter.device)
        except Exception:
            logger.exception('Could not prepare input for model %s, analysis %s', model_name, filename)
            result['models'][model_name] = model_result
            continue
        try:
            gradcam_path = os.path.join(upload_dir, f'{filename}_{model_file_key}_gradcam.png')
            with torch.enable_grad():
                overlay = generate_gradcam_overlay(model, input_tensor, original_rgb, target_class)
            if overlay is not None and cv2.imwrite(gradcam_path, overlay):
                model_result['gradcam_available'] = True
                model_result['gradcam_file'] = os.path.basename(gradcam_path)
        except Exception:
            logger.exception('Grad-CAM generation failed for model %s, analysis %s', model_name, filename)

        result['models'][model_name] = model_result

    # Generate every Grad-CAM before starting SHAP. SHAP's gradient hooks can
    # otherwise interfere with subsequent Grad-CAM passes in the same request.
    for model_name, model_prediction in individual_models.items():
        model = loaded_models.get(model_name)
        model_result = result['models'].get(model_name)
        if model is None or model_result is None:
            continue
        model_file_key = _model_file_key(model_name)
        try:
            input_tensor = TRANSFORM(processed).unsqueeze(0).to(next(model.parameters()).device)
            with torch.enable_grad():
                saliency = _shap_map(model, input_tensor, int(model_prediction['predicted_class']))
            shap_path = os.path.join(upload_dir, f'{filename}_{model_file_key}_shap.png')
            overlay = show_cam_on_image(original_rgb, saliency, use_rgb=True)
            if cv2.imwrite(shap_path, overlay):
                model_result['shap_available'] = True
                model_result['shap_file'] = os.path.basename(shap_path)
        except Exception:
            logger.exception('SHAP generation failed for model %s, analysis %s', model_name, filename)

    result['gradcam_available'] = any(item['gradcam_available'] for item in result['models'].values())
    result['shap_available'] = any(item['shap_available'] for item in result['models'].values())
    gradcam_model = next((name for name, item in result['models'].items() if item['gradcam_available']), None)
    shap_model = next((name for name, item in result['models'].items() if item['shap_available']), None)
    result['gradcam_file'] = result['models'].get(gradcam_model, {}).get('gradcam_file')
    result['shap_file'] = result['models'].get(shap_model, {}).get('shap_file')
    result['explanation_model'] = gradcam_model or shap_model

    return result

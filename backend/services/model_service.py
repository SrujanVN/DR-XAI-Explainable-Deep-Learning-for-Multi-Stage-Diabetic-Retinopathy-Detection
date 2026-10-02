import os

from torchvision import transforms

from utils.models import MODEL_CONFIGS, predict_ensemble
from utils.preprocessing import IMAGE_SIZE, preprocess_image_inference

NORMALIZATION_MEAN = [0.4247607406554276, 0.41477363903977665, 0.40914320244558566]
NORMALIZATION_STD = [0.261673335762141, 0.2545360808997545, 0.2384415815175597]
TRANSFORM = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=NORMALIZATION_MEAN, std=NORMALIZATION_STD),
])
CLASS_NAMES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']


class ModelUnavailable(RuntimeError):
    pass


def run_inference(image_path, loaded_models):
    if not isinstance(loaded_models, dict):
        raise ModelUnavailable('The backend model registry is unavailable.')
    missing_models = [name for name in MODEL_CONFIGS if loaded_models.get(name) is None]
    if missing_models:
        raise ModelUnavailable(f'All four local checkpoints must load before analysis. Unavailable: {", ".join(missing_models)}.')
    processed = preprocess_image_inference(image_path, image_size=IMAGE_SIZE)
    if processed is None:
        raise ValueError('The uploaded file could not be decoded as a retinal image.')
    outcome = predict_ensemble(TRANSFORM(processed).unsqueeze(0), loaded_models)
    if not outcome or outcome.get('ensemble_prediction') is None:
        raise ModelUnavailable('The loaded models could not produce a prediction.')
    successful = [name for name, row in outcome.get('individual_results', {}).items() if 'error' not in row]
    if len(successful) != len(MODEL_CONFIGS):
        failed = [name for name in MODEL_CONFIGS if name not in successful]
        raise ModelUnavailable(f'All four models must complete inference. Failed: {", ".join(failed)}.')

    probabilities = outcome.get('ensemble_probabilities') or []
    if len(probabilities) != len(CLASS_NAMES):
        valid = [row for row in outcome.get('individual_results', {}).values() if 'error' not in row]
        rows_with_probabilities = [row['probabilities'] for row in valid if len(row.get('probabilities', [])) == len(CLASS_NAMES)]
        probabilities = [
            sum(row[index] for row in rows_with_probabilities) / len(rows_with_probabilities)
            for index in range(len(CLASS_NAMES))
        ] if rows_with_probabilities else []
    if not probabilities:
        raise ModelUnavailable('The loaded models did not return probability distributions.')
    predicted = int(outcome['ensemble_prediction'])
    model_names = [name for name, model in loaded_models.items() if model is not None]
    individual_models = {}
    for name, row in outcome.get('individual_results', {}).items():
        if 'error' in row or len(row.get('probabilities', [])) != len(CLASS_NAMES):
            continue
        model_class = int(row['predicted_class'])
        individual_models[name] = {
            'predicted_class': model_class,
            'class_name': CLASS_NAMES[model_class],
            'confidence': float(row['confidence']),
            'probabilities': row['probabilities'],
        }
    return {
        'class': predicted,
        'class_name': CLASS_NAMES[predicted],
        'confidence': probabilities[predicted],
        'probabilities': dict(zip(['No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'], probabilities)),
        'probability_values': probabilities,
        'individual_models': individual_models,
        'model': {
            'name': os.getenv('MODEL_NAME') or ', '.join(model_names),
            'version': os.getenv('MODEL_VERSION', 'current-checkpoints'),
        },
    }

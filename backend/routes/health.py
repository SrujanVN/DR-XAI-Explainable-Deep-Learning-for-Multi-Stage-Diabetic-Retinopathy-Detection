from flask import Blueprint, current_app, jsonify

from backend.database.mongodb import store
from utils.models import MODEL_CONFIGS

health_api = Blueprint('health_api', __name__)


@health_api.get('/api/health')
def health():
    database_connected = store.ping()
    models = current_app.config.get('LOADED_MODELS', {})
    loaded_model_names = [name for name in MODEL_CONFIGS if isinstance(models, dict) and models.get(name) is not None]
    inference_available = len(loaded_model_names) == len(MODEL_CONFIGS)
    return jsonify({
        'status': 'ok' if database_connected else ('degraded' if inference_available else 'unavailable'),
        'database': 'connected' if database_connected else 'unavailable',
        'inference_available': inference_available,
        'loaded_models': loaded_model_names,
        'expected_models': list(MODEL_CONFIGS),
    }), (200 if inference_available else 503)

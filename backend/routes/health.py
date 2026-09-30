from flask import Blueprint, current_app, jsonify

from backend.database.mongodb import store

health_api = Blueprint('health_api', __name__)


@health_api.get('/api/health')
def health():
    database_connected = store.ping()
    models = current_app.config.get('LOADED_MODELS', {})
    inference_available = isinstance(models, dict) and any(model is not None for model in models.values())
    return jsonify({
        'status': 'ok' if database_connected else 'unavailable',
        'database': 'connected' if database_connected else 'unavailable',
        'inference_available': inference_available,
    }), (200 if database_connected else 503)

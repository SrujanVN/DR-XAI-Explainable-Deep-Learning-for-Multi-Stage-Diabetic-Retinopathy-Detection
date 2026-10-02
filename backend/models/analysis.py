from datetime import datetime, timezone
import uuid


def build_analysis_document(filename, content_type, prediction, explainability=None, preprocessing=None):
    return {
        'analysis_id': f'DRXAI-{uuid.uuid4().hex}',
        'created_at': datetime.now(timezone.utc),
        'status': 'completed',
        'image': {'filename': filename, 'path': f'uploads/{filename}', 'content_type': content_type},
        'preprocessing': preprocessing or {},
        'prediction': {
            'class': prediction['class'],
            'class_name': prediction['class_name'],
            'confidence': prediction['confidence'],
            'probabilities': prediction['probabilities'],
            'individual_models': prediction.get('individual_models', {}),
        },
        'model': prediction['model'],
        'explainability': explainability or {'gradcam_available': False, 'shap_available': False},
        'report': {'generated': False},
    }

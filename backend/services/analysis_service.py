import os
import uuid

from backend.database.mongodb import store
from backend.models.analysis import build_analysis_document
from backend.services.model_service import run_inference
from utils.explainability import generate_explanations
from utils.preprocessing import save_preprocessing_views


class DatabaseUnavailable(Exception):
    pass


def create_analysis(upload, image_format, content_type, upload_dir, loaded_models):
    os.makedirs(upload_dir, exist_ok=True)
    extension = 'jpg' if image_format == 'JPEG' else 'png'
    generated_name = f'{uuid.uuid4().hex}.{extension}'
    image_path = os.path.join(upload_dir, generated_name)
    upload.save(image_path)
    try:
        prediction = run_inference(image_path, loaded_models)
        preprocessing = save_preprocessing_views(image_path, upload_dir)
        explanations = generate_explanations(image_path, loaded_models, prediction, upload_dir)
        document = build_analysis_document(generated_name, content_type, prediction, explanations, preprocessing)
        if store.ping():
            store.insert(document)
        else:
            store.cache_local(document)
        return document
    except Exception:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise

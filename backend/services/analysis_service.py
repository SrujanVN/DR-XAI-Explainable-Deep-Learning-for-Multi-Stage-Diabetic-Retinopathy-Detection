import os

from backend.database.mongodb import store
from backend.models.analysis import build_analysis_document
from backend.services.model_service import run_inference


class DatabaseUnavailable(Exception):
    pass


def create_analysis(upload, image_format, content_type, upload_dir, loaded_models):
    if not store.ping():
        raise DatabaseUnavailable('Database unavailable.')
    os.makedirs(upload_dir, exist_ok=True)
    extension = 'jpg' if image_format == 'JPEG' else 'png'
    generated_name = f'{uuid.uuid4().hex}.{extension}'
    image_path = os.path.join(upload_dir, generated_name)
    upload.save(image_path)
    try:
        prediction = run_inference(image_path, loaded_models)
        document = build_analysis_document(generated_name, content_type, prediction)
        store.insert(document)
        return document
    except Exception:
        if os.path.exists(image_path):
            os.remove(image_path)
        raise

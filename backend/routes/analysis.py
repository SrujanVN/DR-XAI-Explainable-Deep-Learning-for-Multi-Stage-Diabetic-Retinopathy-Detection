from flask import Blueprint, current_app, jsonify, request, send_from_directory
from pymongo.errors import PyMongoError

from backend.database.mongodb import store
from backend.services.analysis_service import DatabaseUnavailable, create_analysis
from backend.services.model_service import ModelUnavailable
from backend.services.report_service import generated_report_metadata
from backend.utils.serialization import serialize_document
from backend.utils.validation import valid_analysis_id, validate_image

analysis_api = Blueprint('analysis_api', __name__)


def error(code, message, status):
    return jsonify({'success': False, 'error': {'code': code, 'message': message}}), status


def success(data, status=200):
    return jsonify({'success': True, 'data': serialize_document(data)}), status


@analysis_api.post('/api/analyses')
def create():
    upload = request.files.get('image')
    if not upload or not upload.filename:
        return error('IMAGE_REQUIRED', 'Choose a retinal image to analyze.', 400)
    upload.stream.seek(0, 2)
    size = upload.stream.tell()
    upload.stream.seek(0)
    if size > current_app.config['MAX_CONTENT_LENGTH']:
        return error('FILE_TOO_LARGE', 'Image must be 12 MB or smaller.', 413)
    extension = upload.filename.rsplit('.', 1)[-1].lower() if '.' in upload.filename else ''
    if extension not in {'jpg', 'jpeg', 'png'}:
        return error('INVALID_IMAGE', 'The uploaded file is not a supported retinal image.', 400)
    image_format, content_type = validate_image(upload.stream)
    if not image_format:
        return error('INVALID_IMAGE', 'The uploaded file is not a supported retinal image.', 400)
    upload.stream.seek(0)
    try:
        document = create_analysis(
            upload, image_format, content_type, current_app.config['DRXAI_UPLOAD_DIR'],
            current_app.config.get('LOADED_MODELS', {}),
        )
        return success(document, 201)
    except DatabaseUnavailable:
        return error('DATABASE_UNAVAILABLE', 'Database unavailable.', 503)
    except ValueError as exc:
        return error('INVALID_IMAGE', str(exc), 400)
    except ModelUnavailable as exc:
        return error('MODEL_UNAVAILABLE', str(exc), 503)
    except PyMongoError:
        return error('DATABASE_ERROR', 'The analysis could not be saved.', 503)
    except Exception:
        current_app.logger.exception('Analysis failed')
        return error('ANALYSIS_FAILED', 'The analysis could not be completed.', 503)


@analysis_api.get('/api/analyses')
def list_analyses():
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, max(1, int(request.args.get('limit', 20))))
    except (TypeError, ValueError):
        return error('INVALID_PAGINATION', 'Page and limit must be positive integers.', 400)
    try:
        items = [serialize_document(item) for item in store.list((page - 1) * limit, limit)]
        return success({'items': items, 'page': page, 'limit': limit, 'total': store.count()})
    except PyMongoError:
        return error('DATABASE_UNAVAILABLE', 'Database unavailable.', 503)


@analysis_api.get('/api/analyses/<analysis_id>')
def get_analysis(analysis_id):
    if not valid_analysis_id(analysis_id):
        return error('INVALID_ANALYSIS_ID', 'The analysis ID is invalid.', 400)
    try:
        document = store.get(analysis_id)
    except PyMongoError:
        return error('DATABASE_UNAVAILABLE', 'Database unavailable.', 503)
    if document is None:
        return error('ANALYSIS_NOT_FOUND', 'Analysis was not found.', 404)
    return success(document)


@analysis_api.get('/api/analyses/<analysis_id>/image')
def get_analysis_image(analysis_id):
    if not valid_analysis_id(analysis_id):
        return error('INVALID_ANALYSIS_ID', 'The analysis ID is invalid.', 400)
    document = store.get(analysis_id)
    if document is None:
        return error('ANALYSIS_NOT_FOUND', 'Analysis was not found.', 404)
    filename = document.get('image', {}).get('filename', '')
    return send_from_directory(current_app.config['DRXAI_UPLOAD_DIR'], filename)


@analysis_api.get('/api/analyses/<analysis_id>/preprocessing/<view_name>')
def get_analysis_preprocessing_view(analysis_id, view_name):
    if not valid_analysis_id(analysis_id):
        return error('INVALID_ANALYSIS_ID', 'The analysis ID is invalid.', 400)
    fields = {'filtered': 'filtered_file', 'clahe-green': 'clahe_green_file'}
    field = fields.get(view_name)
    if field is None:
        return error('INVALID_PREPROCESSING_VIEW', 'The requested preprocessing view is unavailable.', 404)
    document = store.get(analysis_id)
    if document is None:
        return error('ANALYSIS_NOT_FOUND', 'Analysis was not found.', 404)
    filename = document.get('preprocessing', {}).get(field)
    if not filename:
        return error('PREPROCESSING_VIEW_UNAVAILABLE', 'This preprocessing view was not saved for the analysis.', 404)
    return send_from_directory(current_app.config['DRXAI_UPLOAD_DIR'], filename, mimetype='image/png')


@analysis_api.get('/api/analyses/<analysis_id>/explanations/<explanation_type>')
@analysis_api.get('/api/analyses/<analysis_id>/explanations/<explanation_type>/<model_name>')
def get_analysis_explanation(analysis_id, explanation_type, model_name=None):
    if not valid_analysis_id(analysis_id):
        return error('INVALID_ANALYSIS_ID', 'The analysis ID is invalid.', 400)
    if explanation_type not in {'gradcam', 'shap'}:
        return error('INVALID_EXPLANATION', 'The requested explanation is unavailable.', 404)
    document = store.get(analysis_id)
    if document is None:
        return error('ANALYSIS_NOT_FOUND', 'Analysis was not found.', 404)
    explanation = document.get('explainability', {})
    if model_name:
        explanation = explanation.get('models', {}).get(model_name, {})
    filename = explanation.get(f'{explanation_type}_file')
    if not explanation.get(f'{explanation_type}_available') or not filename:
        return error('EXPLANATION_UNAVAILABLE', 'This explanation could not be generated for the analysis.', 404)
    return send_from_directory(current_app.config['DRXAI_UPLOAD_DIR'], filename, mimetype='image/png')


@analysis_api.post('/api/analyses/<analysis_id>/report')
def mark_report_generated(analysis_id):
    if not valid_analysis_id(analysis_id):
        return error('INVALID_ANALYSIS_ID', 'The analysis ID is invalid.', 400)
    try:
        metadata = generated_report_metadata(analysis_id)
        if not store.set_report_metadata(analysis_id, metadata):
            return error('ANALYSIS_NOT_FOUND', 'Analysis was not found.', 404)
        return success({'analysis_id': analysis_id, 'report': serialize_document(metadata)})
    except PyMongoError:
        return error('DATABASE_UNAVAILABLE', 'Report metadata could not be saved.', 503)

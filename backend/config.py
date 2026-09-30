import os


class Config:
    MONGODB_URI = os.getenv('MONGODB_URI')
    DATABASE_NAME = os.getenv('DATABASE_NAME', os.getenv('MONGODB_DB_NAME', 'dr_xai'))
    UPLOAD_DIR = os.getenv('DRXAI_UPLOAD_DIR', os.path.join(os.path.dirname(__file__), 'uploads'))
    MAX_CONTENT_LENGTH = 12 * 1024 * 1024

import re
from PIL import Image, UnidentifiedImageError

ALLOWED_FORMATS = {'JPEG': 'image/jpeg', 'PNG': 'image/png'}
ANALYSIS_ID_PATTERN = re.compile(r'^DRXAI-[0-9a-f]{32}$')


def validate_image(stream):
    try:
        image = Image.open(stream)
        image_format = image.format
        image.verify()
        if image_format not in ALLOWED_FORMATS:
            return None, None
        return image_format, ALLOWED_FORMATS[image_format]
    except (UnidentifiedImageError, OSError, ValueError):
        return None, None


def valid_analysis_id(value):
    return isinstance(value, str) and bool(ANALYSIS_ID_PATTERN.fullmatch(value))

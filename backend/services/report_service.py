from datetime import datetime, timezone


def report_reference(analysis_id):
    return {'analysis_id': analysis_id, 'generated': False}


def generated_report_metadata(analysis_id):
    return {
        'analysis_id': analysis_id,
        'generated': True,
        'generated_at': datetime.now(timezone.utc),
        'format': 'json',
    }

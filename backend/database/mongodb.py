from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError


class MongoStore:
    def __init__(self):
        self.client = None
        self.analyses = None
        self.error = None
        self.uri = None
        self.database_name = None
        self.indexes_initialized = False

    def connect(self, uri, database_name):
        self.error = None
        if not uri:
            self.error = 'MONGODB_URI is not configured'
            return False
        self.uri, self.database_name = uri, database_name
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=2500, connectTimeoutMS=2500)
            self.client = client
            self.analyses = client[database_name]['analyses']
            client.admin.command('ping')
            self._ensure_indexes()
            return True
        except PyMongoError as exc:
            self.error = str(exc)
            return False

    def ping(self):
        if self.client is None:
            return self.connect(self.uri, self.database_name) if self.uri else False
        try:
            self.client.admin.command('ping')
            self._ensure_indexes()
            return True
        except PyMongoError:
            return False

    def close(self):
        if self.client is not None:
            self.client.close()
        self.client, self.analyses = None, None
        self.indexes_initialized = False

    def _ensure_indexes(self):
        if not self.indexes_initialized:
            self.analyses.create_index([('analysis_id', ASCENDING)], unique=True)
            self.analyses.create_index([('created_at', DESCENDING)])
            self.indexes_initialized = True

    def insert(self, document):
        return self.analyses.insert_one(document).inserted_id

    def get(self, analysis_id):
        return self.analyses.find_one({'analysis_id': analysis_id}, {'_id': 0})

    def list(self, skip, limit):
        return list(self.analyses.find({}, {'_id': 0}).sort('created_at', DESCENDING).skip(skip).limit(limit))

    def count(self):
        return self.analyses.count_documents({})

    def set_report_metadata(self, analysis_id, metadata):
        return self.analyses.update_one({'analysis_id': analysis_id}, {'$set': {'report': metadata}}).matched_count > 0


store = MongoStore()

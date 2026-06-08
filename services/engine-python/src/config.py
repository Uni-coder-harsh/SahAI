import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
TELEMETRY_QUEUE = os.environ.get("TELEMETRY_QUEUE", "telemetry_queue")

PG_HOST = os.environ.get("PG_HOST", "localhost")
PG_PORT = int(os.environ.get("PG_PORT", 5432))
PG_USER = os.environ.get("PG_USER", "sahai_user")
PG_PASSWORD = os.environ.get("PG_PASSWORD", "sahai_password")
PG_DATABASE = os.environ.get("PG_DATABASE", "sahai_db")

MONGO_URI = os.environ.get(
    "MONGO_URI", 
    "mongodb://sahai_admin:sahai_admin_password@localhost:27017/sahai_mongo_db?authSource=admin"
)
